# Develop

1. Call `npm install` in this directory.
2. Open this directory in VScode.
3. Press F5.
4. A second window should open where you can use this extension.

# Build

1. Call `npm install` in this directory.
2. Call `./node_modules/.bin/vsce package`.
3. A file called `virtualtabletop-io-X.X.X.vsix` should be created in the current directory that can be installed in VScode.

# Usage

1. Press F1.
2. Call `VTT: Init`.
3. You should see a folder `VirtualTabletop.io` in your workspace.
4. Create a file in that folder with the name of your room.
5. You should see the JSON of your room and whenever you save, the state should update in the room.

# Changing target url (Optional)

1. Make sure an url change is needed. (Default is `virtualtabletop.io`) 
2. Create a file in `./out` called `vttex.server.conf`.
3. Put new target url inside `vttex.server.conf`. 
4. Make sure url includes protocol. (either `http:` or `https:`)

