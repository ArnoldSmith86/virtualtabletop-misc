import * as vscode from 'vscode';
import * as https from 'https';


class UrlFileSystemProvider implements vscode.FileSystemProvider {
	public room = 'VScode';
	private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;
	watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
		throw new Error('Method not implemented.');
	}
	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return [ [this.room, vscode.FileType.File]];
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
    // File metadata cache to prevent multiple requests to the same URL
    private cache: { [url: string]: vscode.FileStat } = {};

    // Read the contents of a file from a URL
    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        return new Promise<Uint8Array>((resolve, reject) => {
            https.get(uri.toString().replace(/vtt:\//, 'https://virtualtabletop.io/state/'), (response) => {
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

    // Write the contents of a file to a URL
    async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const request = https.request(uri.toString().replace(/vtt:\//, 'https://virtualtabletop.io/state/'), { method: 'PUT', headers: { 'Content-Type': 'application/json' } }, (response) => {
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

    // Check if a file exists at a URL
    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const cachedStat = this.cache[uri.toString().replace(/vtt:\//, 'https://virtualtabletop.io/state/')];
        if (cachedStat) {
            return cachedStat;
        }

		if(uri.path === '/') {
			return {
				type: vscode.FileType.Directory,
				size: 0,
				ctime: 0,
				mtime: 0
			};
		}

        return new Promise<vscode.FileStat>((resolve, reject) => {
            https.get(uri.toString().replace(/vtt:\//, 'https://virtualtabletop.io/state/'), (response) => {
                if (response.statusCode === 200) {
                    const fileStat: vscode.FileStat = {
                        type: vscode.FileType.File,
                        size: parseInt(response.headers['content-length'] || '', 10),
                        ctime: 0,
                        mtime: 0
                    };
                    this.cache[uri.toString()] = fileStat;
                    resolve(fileStat);
                } else {
                    reject(new Error(`Failed to retrieve file stat: ${response.statusMessage}`));
                }
            });
        });
    }
}

export function activate(context: vscode.ExtensionContext) {
    const fileSystemProvider = new UrlFileSystemProvider();
    // Register the file system provider
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('vtt', fileSystemProvider, { isCaseSensitive: true }));


	context.subscriptions.push(vscode.commands.registerCommand('vtt.workspaceInit', async (url: string) => {
        // Prompt the user for the URL of the file to open
        if (!url) {
            url = await vscode.window.showInputBox({
                prompt: 'Enter the URL of the VTT room to open',
                placeHolder: 'https://virtualtabletop.io/VScode'
            }) || '';
        }


        // Open the file if a URL was entered
        if (url) {
			fileSystemProvider.room = url.replace(/https:\/\/virtualtabletop\.io\//, '');
			vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('vtt:/'), name: "VirtualTabletop.io" });
		}
	}));

    // Register a command to open a file from a URL
    context.subscriptions.push(vscode.commands.registerCommand('vtt.openUrl', async (url: string) => {
        // Prompt the user for the URL of the file to open
        if (!url) {
            url = await vscode.window.showInputBox({
                prompt: 'Enter the URL of the VTT room to open',
                placeHolder: 'https://virtualtabletop.io/VScode'
            }) || '';
        }

        // Open the file if a URL was entered
        if (url) {
            const uri = vscode.Uri.parse('vtt://' + url.replace(/https:\/\/virtualtabletop\.io\//, ''));
            vscode.workspace.openTextDocument(uri).then((document) => {
                vscode.window.showTextDocument(document);
            });
        }
    }));
}

export function deactivate() { }
