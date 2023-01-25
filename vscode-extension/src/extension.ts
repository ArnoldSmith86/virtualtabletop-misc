import * as vscode from 'vscode';
import * as https from 'https';

class UrlFileSystemProvider implements vscode.FileSystemProvider {
	public rooms: [string, vscode.FileType][] = [];
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this.rooms;
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		return new Promise<Uint8Array>((resolve, reject) => {
			console.log("GET", 'https://virtualtabletop.io/state'+uri.path);
			https.get('https://virtualtabletop.io/state'+uri.path, (response) => {
				const data: any[] = [];
				response.on('data', (chunk) => {
					data.push(chunk);
				});
				response.on('end', () => {
					resolve(Buffer.concat(data));
				});
				response.on('error', (error) => {
					reject(error);
				});
			});
		});
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
		if(!this.rooms.filter(e=>e[0]==uri.path).length) {
			console.log("CREATE", 'https://virtualtabletop.io/state'+uri.path);
			this.rooms.push([uri.path, vscode.FileType.File]);
		} else {
			return new Promise<void>((resolve, reject) => {
				console.log("PUT", 'https://virtualtabletop.io/state'+uri.path);
				const request = https.request('https://virtualtabletop.io/state'+uri.path, { method: 'PUT', headers: { 'Content-Type': 'application/json' } }, (response) => {
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

		for(const room of this.rooms) {
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
	const fileSystemProvider = new UrlFileSystemProvider();
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('vtt', fileSystemProvider, { isCaseSensitive: true }));
	context.subscriptions.push(vscode.commands.registerCommand('vtt.workspaceInit', async (url: string) => {
		vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('vtt:/'), name: "VirtualTabletop.io" });
	}));
}

export function deactivate() { }
