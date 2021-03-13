# cypress-service

```
npm install
npm run start
```

http://localhost:4567/about

Built to work with the npm package `cypress-service-client`. https://github.com/Qarj/cypress-service-client

# Overview

Consider two example applications:

-   cypress-backend-app
-   cypress-frontend-app

The Cypress tests, and configuration for those tests belong in the respective apps.

The tests are posted to cypress-service when the app is deployed to an environment.

cypress-service:

-   keeps a copy of the correct version of tests for that deployment
-   runs the tests
-   keeps a copy of the results
-   enables the tests for all applications to be run periodically - say daily

# Architecture - your application with Cypress tests

The client application, say cypress-backend-app, has a structure like this

-   cypress
    -   cypress-dev.json
    -   cypress-preprod.json
    -   cypress-prod.json
    -   integration
    -   fixtures
    -   and so on...

The environment configuration is kept in the `cypress/` folder so the entire folder can
be zipped and posted to cypress-service.

Install the npm package `cypress-service-client` in the application you want to post your Cypress tests from to `cypress-service`.

# Architecture - cypress-service

When the client application posts the `cypress/` folder to cypress-service, it also passes
the following variables:

-   name of application
-   application version
-   target environment

`cypress-service` will then unzip the package to the appropriate folder.

Consider the example `cypress-backend-app`, version `v1.1.5`, `dev`.

Assume it has two folders of tests, `canary` and `core-api`.

The resulting structure on cypress-service will be:

-   tests
    -   dev
        -   cypress-backend-app
            -   fixtures
            -   integration
                -   canary
                -   core-api
            -   plugins
            -   support
            -   cypress-dev.json

The version is informational only, any previously deployed `cypress-backend-app` will be overwritten.

Since the "source of truth" for the tests is the client app, neither the tests nor the config
will be checked into the source control of cypress-service.

When the tests are run, the result structures is as follows:

-   results
    -   dev
        -   cypress-backend-app
            -   2021.02.15
                -   21.06.13-groupName
                    -   suite-name1
                        -   cypress
                        -   downloads
                        -   screenshots
                        -   videos
                        -   mochawesome.html
                    -   suite-name2
                        -   cypress
                        -   downloads
                        -   screenshots
                        -   videos
                        -   mochawesome.html
                    -   summary.html

or

                    -   allSuites
                        -   cypress
                        -   downloads
                        -   screenshots
                        -   videos
                        -   mochawesome.html
                    -   summary.html

Where `2021.02.15` is the date the test started and `21.06.13-groupName` is the unique group name supplied when kicking off the tests - consider supplying the current time at the start of the group name so that test results will be ordered by run start time.

To run the tests, cypress-service will build the `cypress-dev.json` to the Cypress run config `cypress-dev-RUN.json`.

Check https://docs.cypress.io/guides/guides/module-api.htm for information about `cypress.run()` and the config structure it requires - it is different to the regular `cypress.json`.

Suppose your posted `cypress-dev.json` was this:

```json
{
    "env": {
        "frontendLanguages": "German,French,English",
        "frenchHost": "www.france.io",
        "germanHost": "www.german.io",
        "englishHost": "www.english.io",
        "brandHost": "www.brand.dev.io"
    },
    "baseUrl": "http://www.mybaseurl.dev.io",
    "ignoreTestFiles": "*.ignore-this.js",
    "blockHosts": "www.block.this.host.io",
    "userAgent": "this is my useragent string",
    "viewportHeight": 770,
    "viewportWidth": 1110
}
```

The `cypress-service` built run config `cypress-dev-RUN.json` could look like this:

```json
{
    "config": {
        "video": true,
        "defaultCommandTimeout": 30000,
        "requestTimeout": 30000,
        "screenshotOnRunFailure": true,
        "chromeWebSecurity": false,
        "integrationFolder": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/cypress/integration",
        "fixturesFolder": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/cypress/fixtures",
        "pluginsFile": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/cypress/plugins/index.js",
        "supportFile": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/cypress/support/index.js",
        "downloadsFolder": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/downloads",
        "screenshotsFolder": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/screenshots",
        "videosFolder": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/videos"
    },
    "spec": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites/cypress/integration/**/*",
    "reporter": "mochawesome",
    "reporterOptions": {
        "reportDir": "results/dev/cypress-frontend-app/2021.03.11/21.51.05.490/allSuites",
        "overwrite": false,
        "html": false,
        "json": true
    },
    "env": {
        "frontendLanguages": "German,French,English",
        "frenchHost": "www.france.io",
        "germanHost": "www.german.io",
        "englishHost": "www.english.io",
        "brandHost": "www.brand.dev.io"
    },
    "baseUrl": "http://www.mybaseurl.dev.io",
    "ignoreTestFiles": "*.ignore-this.js",
    "blockHosts": "www.block.this.host.io",
    "userAgent": "this is my useragent string",
    "viewportHeight": 770,
    "viewportWidth": 1110
}
```

# Core API

## POST /tests/:env/:app

Post your `cypress` folder containing all your tests and config to the cypress-service.

path `/tests/{env}/{app}` example: `/tests/dev/cypress-frontend-app`
posttype `multipart/form-data`

field `uploadFile` - expect zip file of mime type `application/zip`
field `version` - version of tests, e.g. `v1.5.2`

Response 201

```json
{
    "message": "File is uploaded, version written to version.json and unzipped ok.",
    "status": 201,
    "info": {
        "name": "cypress-frontend-app.zip",
        "mimetype": "application/zip",
        "size": 11210,
        "version": "v1.5.2",
        "env": "dev",
        "app": "cypress-frontend-app"
    }
}
```

## GET /tests/:env/:app?suite=core-frontend&group=MyGroup

Run a single suite of tests and return the result in JSON.

`suite`: A suite for cypress-service is defined as any of the subfolders directly under `cypress/integration`.
`group`: An identifier to group related suites on the `summary.html` report.

Example: GET /tests/prod/cypress-frontend-app?suite=core-frontend&group=MyGroup

The response will be the JSON that `cypress.run()` returns - see https://docs.cypress.io/guides/guides/module-api.html

Additional query string options:

`noVideo=1`: Do not capture video.
`noWait=1`: Do not wait for a response, return immediately. You can then start additional suites in parallel.

When the `noWait=1` option is used, the example response will be like:

```json
{
    "message": "Tests kicked off but not waiting for the result - returning built run config file cypress-red-RUN.json.",
    "info": {
        "version": "v4.783.21",
        "env": "prod",
        "app": "cypress-frontend-app",
        "group": "MyGroup",
        "suite": "core-frontend",
        "deployPath": "tests/prod/cypress-frontend-app"
    },
    "runConfig": {
        "config": {
            "video": false,
            "defaultCommandTimeout": 30000,
            "requestTimeout": 30000,
            "screenshotOnRunFailure": true,
            "chromeWebSecurity": false,
            "integrationFolder": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/cypress/integration",
            "fixturesFolder": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/cypress/fixtures",
            "pluginsFile": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/cypress/plugins/index.js",
            "supportFile": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/cypress/support/index.js",
            "downloadsFolder": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/downloads",
            "screenshotsFolder": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/screenshots",
            "videosFolder": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/videos"
        },
        "spec": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary/cypress/integration/canary/**/*",
        "reporter": "mochawesome",
        "reporterOptions": {
            "reportDir": "results/prod/cypress-frontend-app/2021.03.07/20.11.16.202/suite-canary",
            "overwrite": false,
            "html": false,
            "json": true
        },
        "env": { "brandHost": "www.brand.prod.io" }
    }
}
```

This API is used by the npm package `cypress-service-client` to kick of the tests in parallel.

## GET /tests/:env/:app?group=MyGroup

Runs all the tests under the `cypress/integration` folder one after the other (i.e. sequentially).

Other options and example responses are as per above.

## GET /tests/:env/:app/summary

Returns a html summary report showing the pass/fail result for each of the suites in the app.

The most recent run group results are returned.

For each suite there is a link to the mochawesome report.

![Alt text](static/summary_pass_example.png 'summary.html pass example')

# Additional API

These other routes were created to make the automated self-test easier.

To run the self test:

In one terminal

```
npm run start
```

In another terminal

```
npm run cypress:open
```

Then run all tests!

## /tests/:env/:app/runConfig

Returns the latest built run config for that app - the run config is only built when you kick off a test run.

## /tests/:env/:app/message

Returns the last message (response) that you got when you posted some tests.

## /tests/:env/:app/lastReport

Redirects to the last mochawesome.html report generated for those tests.

## /tests/:env/:app/lastRunResult

Returns the last json run result returned by `cypress.run()` for those tests.

## /ping

Returns a message confirming the server is up.

# Server installation

Consider using the npm package `pm2` - this makes it very easy to setup.

All you have to do is install this globally:

```
npm install pm2 -g
```

Then from within the `cypress-service` folder:

```
pm2 start index.js
```

This will start it and daemonise it and you are done. It even works on Windows!

Note re Windows - It is strongly suggested to use Linux and not Windows as the server. In a test conducted on a 4 core 8 thread AWS XEON server with 16 GB memory it took 600 seconds to conduct a certain heavily parallel test. The same test on Linux running inside Virtual Box with just 8 GB of memory and 3 cores / 6 threads took just 100 seconds - and this was on a Dell laptop!
