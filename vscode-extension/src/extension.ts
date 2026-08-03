import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';

class UrlFileSystemProvider implements vscode.FileSystemProvider {
	public rooms = new Map<string, [string, vscode.FileType][]>();
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	constructor(private context: vscode.ExtensionContext) {}

	private roomsFor(uri: vscode.Uri): [string, vscode.FileType][] {
		let rooms = this.rooms.get(uri.authority);
		if (!rooms) {
			rooms = [];
			this.rooms.set(uri.authority, rooms);
		}
		return rooms;
	}

	private getServerUrl(uri: vscode.Uri): string {
		let url = this.context.globalState.get<string>('serverUrl_' + uri.authority) || this.context.globalState.get<string>('lastServerUrl') || 'https://virtualtabletop.io';
		if (url.endsWith('/')) {
			url = url.slice(0, -1);
		}
		return url;
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this.roomsFor(uri);
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		return new Promise<Uint8Array>((resolve, reject) => {
			const fullUrl = this.getServerUrl(uri) + '/state' + uri.path;
			const lib = fullUrl.startsWith('https') ? https : http;
			console.log("GET", fullUrl);
			lib.get(fullUrl, (response) => {
				const data: any[] = [];
				response.on('data', (chunk) => {
					data.push(chunk);
				});
				response.on('end', () => {
					resolve(new Uint8Array(Buffer.concat(data)));
				});
				response.on('error', (error) => {
					reject(error);
				});
			}).on('error', (error) => {
				reject(error);
			});
		});
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
		const fullUrl = this.getServerUrl(uri) + '/state' + uri.path;
		const lib = fullUrl.startsWith('https') ? https : http;
		const rooms = this.roomsFor(uri);
		if(!rooms.filter(e=>e[0]===uri.path).length) {
			console.log("CREATE", fullUrl);
			rooms.push([uri.path, vscode.FileType.File]);
		} else {
			return new Promise<void>((resolve, reject) => {
				console.log("PUT", fullUrl);
				const request = lib.request(fullUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' } }, (response) => {
					if (response.statusCode !== 200) {
						reject(new Error(`Failed to save file: ${response.statusMessage}`));
					}
					resolve();
				});
				request.on('error', (error) => {
					reject(error);
				});
				request.write(Buffer.from(content));
				request.end();
			});
		}
	}

	// Check if a file exists at a URL
	stat(uri: vscode.Uri): vscode.FileStat {
		if(uri.path === '/') {
			return {
				type: vscode.FileType.Directory,
				size: 0,
				ctime: 0,
				mtime: 0
			};
		}

		for(const room of this.roomsFor(uri)) {
			if(uri.path === room[0]) {
				return {
					type: vscode.FileType.File,
					size: 0,
					ctime: 0,
					mtime: 0
				};
			}
		}

		throw vscode.FileSystemError.FileNotFound(uri);
	}

	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	delete(uri: vscode.Uri, options: { readonly recursive: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
		throw new Error('Method not implemented.');
	}
}

export function activate(context: vscode.ExtensionContext) {
	const fileSystemProvider = new UrlFileSystemProvider(context);
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('vtt', fileSystemProvider, { isCaseSensitive: true }));
	context.subscriptions.push(vscode.commands.registerCommand('vtt.workspaceInit', async () => {
		const defaultUrl = context.globalState.get<string>('lastServerUrl') || 'https://virtualtabletop.io';
		const url = await vscode.window.showInputBox({
			prompt: 'Enter server URL',
			value: defaultUrl
		});
		if (url) {
			await context.globalState.update('lastServerUrl', url);
			let displayName = url.replace(/^https?:\/\//, '');
			if (displayName.endsWith('/')) {
				displayName = displayName.slice(0, -1);
			}
			await context.globalState.update('serverUrl_' + displayName, url);
			vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse(`vtt://${displayName}/`), name: displayName });
		}
	}));
}

export function deactivate() { }
