import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';


class HttpOrHttps{
	// Small wrapper that calls the right library when making a request.
	// (Might be unnecessary, not sure if this can be done normally in Typescript)

	static hasSecureLayer(web:URL | string): boolean{
		return (typeof web === "string" ? new URL(web): web).protocol.toLowerCase() === "https:" ; 
	}

	static get(options: URL | string, callback?: (res: http.IncomingMessage) => void): http.ClientRequest {
		return HttpOrHttps.hasSecureLayer(options) ? https.get(options, callback):http.get(options, callback);
	}

	static request(url: URL | string, options: http.RequestOptions | https.RequestOptions,  callback?: (res: http.IncomingMessage) => void): http.ClientRequest {
		return HttpOrHttps.hasSecureLayer(url) ? https.request(url, options, callback):http.request(url, options, callback);
	}
}

class UrlFileSystemProvider implements vscode.FileSystemProvider {
	public rooms: [string, vscode.FileType][] = [];
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	private _virtualTabletopUrl;
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

	constructor(vttu:string){
		this._virtualTabletopUrl = new URL(vttu);
	};

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this.rooms;
	}

	async readFile(uri: vscode.Uri): Promise<Uint8Array> {
		return new Promise<Uint8Array>((resolve, reject) => {
			
			console.log("GET", this._virtualTabletopUrl + '/state'+uri.path);

			HttpOrHttps.get(this._virtualTabletopUrl + '/state'+uri.path, (response) => {
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
			console.log("CREATE", this._virtualTabletopUrl + '/state'+uri.path);
			this.rooms.push([uri.path, vscode.FileType.File]);
		} else {
			return new Promise<void>((resolve, reject) => {
				console.log("PUT", this._virtualTabletopUrl + '/state'+uri.path);
				const request = HttpOrHttps.request(this._virtualTabletopUrl + '/state'+uri.path, 
					{ method: 'PUT', headers: { 'Content-Type': 'application/json' } }, (response) => {
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
	const potentialFilePath:string = path.join(__dirname, 'vttex.server.conf');
	const virtualTabletopUrl = fs.existsSync(potentialFilePath)? fs.readFileSync(potentialFilePath, 'utf8') : "https://virtualtabletop.io";
	const fileSystemProvider = new UrlFileSystemProvider(virtualTabletopUrl);
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('vtt', fileSystemProvider, { isCaseSensitive: true }));
	context.subscriptions.push(vscode.commands.registerCommand('vtt.workspaceInit', async (url: string) => {
		vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('vtt:/'), name: "VirtualTabletop.io" });
	}));
}

export function deactivate() { }
