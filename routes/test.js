const cypress = require('cypress');
const express = require('express');
const router = express.Router();
const fu = require('../utils/fu.js');
const fs = require('fs-extra');
const unzipper = require('unzipper');
const marge = require('mochawesome-report-generator');
const { merge } = require('mochawesome-merge');
const config = require('config');
const csc = require('cypress-service-client');

router.post('/:env/:app', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    const deployPath = `tests/${env}/${app}`;

    const version = req.body.version;

    if (!req.files || Object.keys(req.files).length === 0) {
        console.log('No file was uploaded.');
        return setAndSaveJsonResponse(res, deployPath, {
            message: 'No file was uploaded',
            status: 400,
            info: {
                version: version,
                env: env,
                app: app,
            },
        });
    }

    const file = req.files.uploadFile; // called uploadFile on the multipart form

    const info = {
        name: file.name,
        mimetype: file.mimetype,
        size: file.size,
        version: version,
        env: env,
        app: app,
    };

    fu.removeFolderSync(deployPath);

    fu.writeFileAndFoldersSync(`${deployPath}/version.json`, JSON.stringify({ version: version }));

    const archivePath = `${deployPath}/${file.name}`;
    console.log('Writing uploaded file to ' + deployPath);
    fu.writeFileAndFoldersSync(archivePath, file.data);

    console.log('This is the archive path ' + archivePath);
    if (!archivePath.includes('.zip')) {
        return setAndSaveJsonResponse(res, deployPath, {
            message: 'Please provide a .zip file',
            status: 400,
            info: info,
        });
    }

    console.log('Unzipping ' + archivePath);
    const zip = fs.createReadStream(archivePath).pipe(unzipper.Parse({ forceStream: true }));
    for await (const entry of zip) {
        const fileName = entry.path;
        const type = entry.type; // 'Directory' or 'File'
        const size = entry.vars.uncompressedSize; // There is also compressedSize;
        const fileNameWithoutLeadingCypress = fileName.replace(/^cypress\//, '');
        const writePath = `${deployPath}/${fileNameWithoutLeadingCypress}`;
        if (type === 'File') {
            console.log(`Writing ${type} ${writePath} of size ${size}`);
            entry.pipe(fs.createWriteStream(`${writePath}`));
        } else if (type === 'Directory') {
            console.log(`Creating ${type} ${writePath}`);
            await fu.createFoldersSync(`${writePath}`);
            entry.autodrain();
        } else {
            console.log(`Ignoring ${type} ${fileName} of size ${size}`);
            entry.autodrain();
        }
    }

    const expectedConfigFile = `cypress-${env}.json`;
    const expectedConfigPath = `${deployPath}/${expectedConfigFile}`;
    if (!fs.existsSync(expectedConfigPath)) {
        return setAndSaveJsonResponse(res, deployPath, {
            message: `Please provide ${expectedConfigFile} file at cypress root, e.g. cypress/${expectedConfigFile}`,
            status: 400,
            info: info,
        });
    }

    allowTestsForThisAppToBeRun(req, env, app);

    return setAndSaveJsonResponse(res, deployPath, {
        message: 'File is uploaded, version written to version.json and unzipped ok.',
        status: 201,
        info: info,
    });
});

function setAndSaveJsonResponse(res, deployPath, report) {
    const status = report.status;
    fu.writeFileAndFoldersSync(`${deployPath}/message.json`, JSON.stringify(report));
    console.log(report);
    return res.status(status).json(report);
}

router.get('/:env/:app/runConfig', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    const deployPath = `tests/${env}/${app}`;
    const runConfigFile = `cypress-${env}-RUN.json`;
    const runConfigPath = `${deployPath}/${runConfigFile}`;

    const info = {
        env: env,
        app: app,
        deployPath: deployPath,
        runConfigFile: runConfigFile,
        runConfigPath: runConfigPath,
    };

    if (!fs.existsSync(runConfigPath)) {
        return res.status(404).json({
            message: `Built run config file ${runConfigFile} does not exist, have you run the tests yet?`,
            status: 404,
            info: info,
        });
    }

    const runConfigData = fs.readFileSync(runConfigPath, { encoding: 'utf8', flag: 'r' });

    const runConfig = JSON.parse(runConfigData);

    return res.status(200).json({
        message: `Previously built run config file cypress-${env}-RUN.json attached.`,
        info: info,
        runConfig: runConfig,
    });
});

router.get('/:env/:app/message', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    const deployPath = `tests/${env}/${app}`;

    const messagePath = `${deployPath}/message.json`;
    if (!fs.existsSync(messagePath)) {
        return res.status(404).json({
            message: `No message available.`,
            data: {
                env: env,
                app: app,
            },
        });
    }

    const data = fs.readFileSync(messagePath, { encoding: 'utf8', flag: 'r' });
    const message = JSON.parse(data);

    return res.status(200).json(message);
});

router.get('/:env/:app/lastReport', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    const deployPath = `tests/${env}/${app}`;
    const suite = req.query.suite || '';

    let resultFolder = `allSuites`;
    if (suite) {
        resultFolder = `suite-${suite}`;
    }

    const lastReportPath = `${deployPath}/lastReport-${resultFolder}.json`;
    if (!fs.existsSync(lastReportPath)) {
        return res.status(404).json({
            message: `No last mochawesome report available. Maybe these tests are running now?`,
            data: {
                env: env,
                app: app,
            },
        });
    }

    const data = fs.readFileSync(lastReportPath, { encoding: 'utf8', flag: 'r' });
    const lastReport = JSON.parse(data);

    return res.redirect(`/${lastReport.reportDir}/mochawesome.html`);
});

router.get('/:env/:app/lastRunResult', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    const deployPath = `tests/${env}/${app}`;
    const suite = req.query.suite || '';

    let resultFolder = `allSuites`;
    if (suite) {
        resultFolder = `suite-${suite}`;
    }

    const lastRunResultPath = `${deployPath}/lastRunResult-${resultFolder}.json`;
    if (!fs.existsSync(lastRunResultPath)) {
        return res.status(404).json({
            message: `No last run result available. Maybe these tests are running now?`,
            data: {
                env: env,
                app: app,
            },
        });
    }

    const lastRunResult = fu.readJSONSync(lastRunResultPath);

    return res.status(200).json(lastRunResult);
});

router.get('/:env/:app/summary', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    const deployPath = `tests/${env}/${app}`;

    const summaryPath = `${deployPath}/summary.html`;
    if (!fs.existsSync(summaryPath)) {
        return res.status(404).json({
            message: `No group run summary available. Have these tests been deployed?`,
            data: {
                env: env,
                app: app,
            },
        });
    }

    const summary = fs.readFileSync(summaryPath, { encoding: 'utf8', flag: 'r' });

    return res.status(200).send(summary);
});

router.get('/:env/:app/status', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;

    const running = isTestsRunning(req, env, app);
    const modify = running ? '' : 'not ';

    return res.status(200).json({ message: `Tests are ${modify}running for this env and app.`, running: running });
});

router.get('/:env/:app', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    let group = req.query.group || '';
    const noRun = req.query.noRun === '1';
    const noVideo = req.query.noVideo === '1';
    const noWait = req.query.noWait === '1';
    let suite = req.query.suite || '';
    const deployPath = `tests/${env}/${app}`;
    const versionPath = `${deployPath}/version.json`;

    if (!fs.existsSync(versionPath)) {
        return res.status(500).json({
            message: `File ${versionPath} not found - are you sure you deployed these tests?`,
        });
    }
    const versionData = fs.readFileSync(versionPath, { encoding: 'utf8', flag: 'r' });
    const version = JSON.parse(versionData).version;

    group = group.replace(/[/\?%*:|"<>\s]/g, '-');

    const info = {
        version: version,
        env: env,
        app: app,
        group: group,
        suite: suite,
        deployPath: deployPath,
    };

    if (!group) {
        return res.status(400).json({
            message: `Group must be supplied to group suites for an app. Example provide time: group=15.14.32`,
            info: info,
        });
    }

    const postedConfigPath = `tests/${env}/${app}/cypress-${env}.json`;

    if (!fs.existsSync(postedConfigPath)) {
        return res.status(500).json({
            message: `Config file cypress-${env}.json not found - not possible to run tests.`,
            info: info,
        });
    }

    const suitePath = `${deployPath}/integration/${suite}`;
    if (suite && !fs.existsSync(suitePath)) {
        return res.status(404).json({
            message: `Suite does not exist, cannot find ${suitePath}`,
            info: info,
        });
    }

    let resultFolder = `allSuites`;
    if (suite) {
        resultFolder = `suite-${suite}`;
    }

    if (isBlockedFromRunningTheseTests(req, env, app, resultFolder)) {
        return res.status(423).json({
            message: `Tests are still running.`,
            info: info,
        });
    }

    const date = getDate();
    const resultPath = `results/${env}/${app}/${date}/${group}/${resultFolder}`;

    let specPath = `${resultPath}/cypress/integration/**/*`;
    if (suite) {
        specPath = `${resultPath}/cypress/integration/${suite}/**/*`;
    }

    // https://docs.cypress.io/guides/guides/module-api.html#cypress-run
    let runConfig = {
        config: {
            defaultCommandTimeout: 30000,
            requestTimeout: 30000,
            screenshotOnRunFailure: true,
            chromeWebSecurity: false,
            integrationFolder: `${resultPath}/cypress/integration`,
            fixturesFolder: `${resultPath}/cypress/fixtures`,
            pluginsFile: `${resultPath}/cypress/plugins/index.js`,
            supportFile: `${resultPath}/cypress/support/index.js`,
            downloadsFolder: `${resultPath}/downloads`,
            screenshotsFolder: `${resultPath}/screenshots`,
            videosFolder: `${resultPath}/videos`,
        },
        spec: `${specPath}`,
        reporter: 'mochawesome',
        reporterOptions: {
            reportDir: `${resultPath}`,
            overwrite: false,
            html: false,
            json: true,
        },
    };

    const postedConfigData = fs.readFileSync(postedConfigPath, { encoding: 'utf8', flag: 'r' });
    let postedConfig = JSON.parse(postedConfigData);

    copyProperty('env', postedConfig, runConfig);
    copyProperty('baseUrl', postedConfig, runConfig['config']);
    copyProperty('ignoreTestFiles', postedConfig, runConfig['config']);
    copyProperty('blockHosts', postedConfig, runConfig['config']);
    copyProperty('userAgent', postedConfig, runConfig['config']);
    copyProperty('viewportHeight', postedConfig, runConfig['config']);
    copyProperty('viewportWidth', postedConfig, runConfig['config']);
    copyProperty('redirectionLimit', postedConfig, runConfig['config']);
    copyProperty('retries', postedConfig, runConfig['config']);
    copyProperty('port', postedConfig, runConfig['config']);
    copyProperty('numTestsKeptInMemory', postedConfig, runConfig['config']);
    copyProperty('includeShadowDom', postedConfig, runConfig['config']);
    copyProperty('execTimeout', postedConfig, runConfig['config']);
    copyProperty('taskTimeout', postedConfig, runConfig['config']);
    copyProperty('pageLoadTimeout', postedConfig, runConfig['config']);
    copyProperty('responseTimeout', postedConfig, runConfig['config']);
    copyProperty('video', postedConfig, runConfig['config']);
    copyProperty('videoCompression', postedConfig, runConfig['config']);
    copyProperty('animationDistanceThreshold', postedConfig, runConfig['config']);
    copyProperty('waitForAnimations', postedConfig, runConfig['config']);
    copyProperty('scrollBehavior', postedConfig, runConfig['config']);

    if (noVideo) runConfig.config['video'] = false;

    const runConfigPath = `tests/${env}/${app}/cypress-${env}-RUN.json`;
    fs.writeFileSync(runConfigPath, JSON.stringify(runConfig));

    if (noRun) {
        return res.status(200).json({
            message: `Not running the tests - returning built run config file cypress-${env}-RUN.json.`,
            info: info,
            runConfig: runConfig,
        });
    }

    if (fs.existsSync(resultPath)) {
        return res.status(400).json({
            message: `You cannot run the same tests twice for a given batch in the same day. Please suppply a different group.`,
            info: info,
        });
    }

    const groupPath = `results/${env}/${app}/${date}/${group}`;
    if (resultFolder === 'allSuites') {
        if (fs.existsSync(groupPath)) {
            return res.status(400).json({
                message: `You cannot run all suites when you have already run a suite for that batch. Please suppply a different group.`,
                info: info,
            });
        }
    }

    fs.copySync(deployPath, `${resultPath}/cypress`);

    console.log(`We are now running env ${env}, app ${app}, ${resultFolder}`);
    blockTheseTestsFromRunning(req, env, app, resultFolder);

    fu.removeFileIfExistsSync(`${deployPath}/lastReport-${resultFolder}.json`);
    fu.removeFileIfExistsSync(`${deployPath}/lastRunResult-${resultFolder}.json`);

    if (noWait) {
        res.status(200).json({
            message: `Tests kicked off but not waiting for the result - returning built run config file cypress-${env}-RUN.json.`,
            info: info,
            runConfig: runConfig,
        });
    }

    const mochawesomeJSONPath = `${runConfig.reporterOptions.reportDir}/mochawesome*.json`;
    const reportOptions = {
        files: [mochawesomeJSONPath],
        reportDir: runConfig.reporterOptions.reportDir,
        deployPath: deployPath,
        resultFolder: resultFolder,
        groupPath: groupPath,
    };
    now = new Date();
    const summaryOptions = {
        resultFolder: resultFolder,
        resultPath: resultPath,
        groupPath: groupPath,
        info: info,
        runConfig: runConfig,
        isCrash: false,
        mochawesomeJSONPath: mochawesomeJSONPath,
        isPending: true,
        pendingStartTime: now.toISOString(),
    };
    updateSummary('', summaryOptions);
    cypress
        .run(runConfig)
        .then((results) => {
            console.log('Cypress has finished running.');
            summaryOptions['isPending'] = false;
            if (fu.globExistsSync(mochawesomeJSONPath)) {
                generateReportAndSaveLocation(reportOptions);
            } else {
                summaryOptions.isCrash = true;
            }
            updateSummary(results, summaryOptions);
            fu.saveJSONSync(`${deployPath}/lastRunResult-${resultFolder}.json`, results);
            allowTestsForThisSuiteToBeRun(req, env, app, resultFolder);
            if (!noWait) {
                res.send({ results });
            }
        })
        .catch((error) => {
            console.log('There was some kind of error running Cypress. Details follow.');
            console.log(error);
            summaryOptions['isPending'] = false;
            if (fs.existsSync(mochawesomeJSONPath)) {
                generateReportAndSaveLocation(reportOptions);
            } else {
                summaryOptions.isCrash = true;
            }
            updateSummary(error, summaryOptions);
            fu.saveJSONSync(`${deployPath}/lastRunResult-${resultFolder}.json`, error);
            allowTestsForThisSuiteToBeRun(req, env, app, resultFolder);
            if (!noWait) {
                res.send({ error });
            }
        });
});

router.get('/:env/:app/parallel', async function (req, res) {
    const env = req.params.env;
    const app = req.params.app;
    let group = req.query.group || '';
    const noVideo = req.query.noVideo === '1';
    const interval = parseInt(req.query.interval) || 5000;
    const deployPath = `tests/${env}/${app}`;
    const versionPath = `${deployPath}/version.json`;

    if (!fs.existsSync(versionPath)) {
        return res.status(500).json({
            message: `File ${versionPath} not found - are you sure you deployed these tests?`,
        });
    }
    const versionData = fs.readFileSync(versionPath, { encoding: 'utf8', flag: 'r' });
    const version = JSON.parse(versionData).version;

    group = group.replace(/[/\?%*:|"<>\s]/g, '-');

    const info = {
        version: version,
        env: env,
        app: app,
        group: group,
        deployPath: deployPath,
    };

    const serviceBaseUrl = `http://localhost:${config.port}`;

    options = {
        app: app,
        noVideo: noVideo,
        startInterval: interval,
        cypressPath: deployPath,
    };

    if (group) {
        options['groupName'] = group;
    }

    const results = await csc.startParallel(serviceBaseUrl, env, options);
    let serviceMessages = [];

    let failed = false;
    for (let i = 0; i < results.length; i++) {
        if ('text' in results[i]) {
            serviceMessages.push(JSON.parse(results[i].text));
        }
        if ('message' in results[i]) {
            failed = true;
            serviceMessages.push(results[i].message);
        }
    }

    const status = failed ? 'with errors' : 'without error';
    const code = failed ? 500 : 200;

    let summary = {
        message: `Request for all suites in app to be started has been submitted ${status}.`,
        serviceMessages: serviceMessages,
        info: info,
    };
    res.status(code).json(summary);
});

function getDate() {
    const now = new Date();
    const date = now.getFullYear() + '.' + pad(now.getMonth() + 1) + '.' + pad(now.getDate());
    return date;
}

function copyProperty(property, source, destination) {
    if (source.hasOwnProperty(property)) {
        destination[property] = source[property];
    }
}

function pad(str, pad = '00', padLeft = true) {
    if (typeof str === 'undefined') return pad;
    if (padLeft) {
        return (pad + str).slice(-pad.length);
    } else {
        return (str + pad).substring(0, pad.length);
    }
}

function allowTestsForThisAppToBeRun(req, env, app) {
    req.app.locals[`${env}/${app} tests in progress`] = {};
}

function allowTestsForThisSuiteToBeRun(req, env, app, resultFolder) {
    let status = getCurrentRunStatus(req, env, app, resultFolder);
    try {
        delete status[resultFolder];
    } catch (err) {
        console.log('Status not found - possible deploy caused reset. Is ok.');
    }
    req.app.locals[`${env}/${app} tests in progress`] = status;
}

function blockTheseTestsFromRunning(req, env, app, resultFolder) {
    let status = getCurrentRunStatus(req, env, app);
    status[resultFolder] = true;
    req.app.locals[`${env}/${app} tests in progress`] = status;
}

function isTestsRunning(req, env, app) {
    return !isEmpty(getCurrentRunStatus(req, env, app));
}

function isEmpty(obj) {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}

function isBlockedFromRunningTheseTests(req, env, app, resultFolder) {
    let status = getCurrentRunStatus(req, env, app);
    let blocked = status[resultFolder] === true;

    // If attempting to run allSuites, if any individual suite is running, then don't run allSuites
    if (resultFolder === 'allSuites') {
        for (let key in status) {
            if (status.hasOwnProperty(key)) {
                if (status[key] === true) {
                    blocked = true;
                }
            }
        }
    } else {
        // Conversely, if allSuites is running, then block any individual suite
        if (status['allSuites'] === true) {
            blocked = true;
        }
    }

    return blocked;
}

function getCurrentRunStatus(req, env, app) {
    let status = {};
    if (typeof req.app.locals[`${env}/${app} tests in progress`] !== 'undefined') {
        status = req.app.locals[`${env}/${app} tests in progress`];
    }
    return status;
}

function generateReportAndSaveLocation(options) {
    console.log('Now generating report with these options:');
    console.log(options);
    merge(options).then((report) => {
        marge.create(report, options);
        const assetsPath = `${options.reportDir}/assets`;
        if (fs.existsSync(`${assetsPath}/app.js`)) {
            return;
        }
        fs.copySync('workarounds/assets', assetsPath);
    });
    fs.writeFileSync(
        `${options.deployPath}/lastReport-${options.resultFolder}.json`,
        JSON.stringify({ reportDir: options.reportDir }),
    );

    return;
}

function updateSummary(results, runInfo) {
    const info = runInfo.info;
    const resultPath = runInfo.resultPath;
    const resultFolder = runInfo.resultFolder;
    const groupPath = runInfo.groupPath;
    const app = info.app;
    const env = info.env;
    const group = info.group;
    const suite = info.suite;
    const version = info.version;
    const deployPath = info.deployPath;

    fu.saveJSONSync(`${resultPath}/runInfo.json`, runInfo);
    if (!runInfo.isPending) {
        fu.saveJSONSync(`${resultPath}/results.json`, results);
    }

    const suitePath = `${resultPath}/cypress/integration`;
    const folder = fs.readdirSync(suitePath);

    let head = buildTag('title', `${env} ${app}`);
    head += buildCSSLink('summary.css');
    head += buildTag('h1', `${env} - ${app} ${version}`);
    head += buildTag('h2', `Summary for run group ${group}`);

    let th1 = buildTag('th', '');
    let th2 = buildTag('th', '');
    let th3 = buildTag('th', '');
    let th4 = buildTag('th', 'Start');
    let th5 = buildTag('th', 'Duration');
    let rows = buildRow(th1, th2, th3, th4, th5);
    if (resultFolder === 'allSuites') {
        rows += buildSuiteRow('', groupPath);
    } else {
        if (folder.length > 0) {
            folder.forEach(function (item) {
                if (fs.statSync(suitePath + '/' + item).isDirectory()) {
                    console.log(`Have found suite ${item}`);
                    rows += buildSuiteRow(item, groupPath);
                }
            });
        }
    }

    let status = 'pass';
    status = rows.includes('class="pend"') ? 'pend' : status;
    status = rows.includes('class="ready"') ? 'ready' : status;
    status = rows.includes('class="fail"') ? 'fail' : status;
    status = rows.includes('class="crash"') ? 'crash' : status;
    let message = 'All tests passed.';
    message = status === 'pend' ? 'Test completion is still pending.' : message;
    message = status === 'ready' ? 'Some tests have not started.' : message;
    message = status === 'fail' ? 'Some tests failed.' : message;
    message = status === 'crash' ? 'There was a crash preventing a test start.' : message;
    head += buildTag('h2', message, status);

    let table = buildTag('table', rows);
    const summary = buildHtml(head, table);
    fs.writeFileSync(`${deployPath}/summary.html`, summary);
    fs.writeFileSync(`${groupPath}/summary.html`, summary);
}

function buildSuiteRow(suite, groupPath) {
    const testName = suite || 'allSuites';
    const resultPath = suite ? `${groupPath}/suite-${suite}` : `${groupPath}/allSuites`;
    const resultsJSONPath = `${resultPath}/results.json`;
    const runInfoPath = `${resultPath}/runInfo.json`;
    const mochawesomeHtmlPath = `${resultPath}/mochawesome.html`;
    const mochawesomeHtmlWebPath = `/${resultPath}/mochawesome.html`;

    let state = 'not started';
    let totalTests = '?';
    let status = 'ready';
    let startTime = '';
    let duration = '';

    if (fs.existsSync(resultsJSONPath)) {
        state = 'done';
        results = fu.readJSONSync(resultsJSONPath);
        totalTests = results.totalTests;
        status = results.totalFailed === 0 ? 'pass' : 'fail';
        startTime = results.startedTestsAt.replace(/[TZ]/g, ' ');
        duration = results.totalDuration / 1000;
    }

    let runInfo = {
        isCrash: false,
        isPending: false,
    };
    if (fs.existsSync(runInfoPath)) {
        runInfo = fu.readJSONSync(runInfoPath);
    }
    if (runInfo.isCrash) {
        status = 'crash';
        fs.copySync(resultsJSONPath, mochawesomeHtmlPath); // no mochawesome available on crash
    }
    if (runInfo.isPending) {
        status = 'pend';
        state = 'pend';
        startTime = runInfo.pendingStartTime.replace(/[TZ]/g, ' ');
    }

    let td1 = buildTag('td', state === 'done' ? buildLink(mochawesomeHtmlWebPath, testName) : testName);
    let td2 = buildTag('td', `${totalTests} tests`);
    let td3 = buildTag('td', status, status, testName);
    let td4 = buildTag('td', startTime);
    let td5 = buildTag('td', duration ? `${duration} seconds` : '');

    return buildRow(td1, td2, td3, td4, td5);
}

function buildTag(tag, content, css = '', info = '') {
    css ? (css = ` class="${css}"`) : css;
    info ? (info = ` info="${info}"`) : info;
    return `<${tag}${css}${info}>\n    ${content}\n</${tag}>\n`;
}

function buildLink(url, linkText) {
    return `<a href="${url}">${linkText}</a>`;
}

function buildCSSLink(path) {
    return `<link rel="stylesheet" href="/static/summary.css">\n`;
}

function buildRow(c1, c2, c3, c4, c5) {
    return `<tr>\n${c1}${c2}${c3}${c4}${c5}\n</tr>\n`;
}

function buildHtml(head, body) {
    return `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;
}

module.exports = router;
