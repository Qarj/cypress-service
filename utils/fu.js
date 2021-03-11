const fs = require('fs');
const glob = require('glob');

function writeFileAndFoldersSync(path, content) {
    const folders = getFoldersWithoutFilename(path);

    createFoldersSync(folders);

    fs.writeFileSync(path, content);
}

function createFoldersSync(folders) {
    fs.mkdirSync(folders, { recursive: true }, (err) => {
        if (err) throw err;
    });
}

function getFoldersWithoutFilename(path) {
    return path.replace(/[/][^/]+$/, '');
}

function removeFolderSync(path) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);

        if (files.length > 0) {
            files.forEach(function (filename) {
                if (fs.statSync(path + '/' + filename).isDirectory()) {
                    removeFolderSync(path + '/' + filename);
                } else {
                    fs.unlinkSync(path + '/' + filename);
                }
            });
            fs.rmdirSync(path);
        } else {
            fs.rmdirSync(path);
        }
    } else {
        console.log('Directory path not found.');
    }
}

function removeFileIfExistsSync(path) {
    if (fs.existsSync(path)) {
        const stats = fs.statSync(path);
        if (stats.isFile()) {
            fs.unlinkSync(path);
        }
    }
}

function saveJSONSync(path, content) {
    fs.writeFileSync(path, JSON.stringify(content));
}

function readJSONSync(path) {
    const data = fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
    return JSON.parse(data);
}

function globExistsSync(pattern) {
    const matches = glob.sync(pattern);
    return matches.length > 0;
}

module.exports = {
    writeFileAndFoldersSync,
    createFoldersSync,
    removeFolderSync,
    removeFileIfExistsSync,
    saveJSONSync,
    readJSONSync,
    globExistsSync,
};
