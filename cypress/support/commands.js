/* eslint-disable cypress/no-unnecessary-waiting */
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('checkPing', () => {
    cy.visit('http://localhost:4567/ping');
    cy.get('body').contains('cypress-service is up!').should('exist');
});

Cypress.Commands.add('multipartFormRequest', (method, url, formData, done) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
        done(xhr);
    };
    xhr.onerror = function () {
        done(xhr);
    };
    xhr.send(formData);
});

Cypress.Commands.add('postTests', function (path, postedFileName, version, expectedStatusCode = 201, expectedMessage = 'unzipped ok') {
    const baseUrl = Cypress.config().baseUrl;
    const postUrl = `${baseUrl}${path}`;
    const base64FileName = `${postedFileName}.base64`;

    // pretend we are doing the GET request for the multipart form
    cy.request(`${baseUrl}/ping`).as('multipartForm');

    // specify the zip file we are posting in base64 format
    // base64 myFile.zip > myFile.zip.base64
    cy.fixture(base64FileName).as('base64File'); // file content in base64

    cy.get('@multipartForm').then((response) => {
        const formData = new FormData();
        formData.append('version', version);

        const mimeType = 'application/zip';
        const blob = Cypress.Blob.base64StringToBlob(this.base64File, mimeType);
        formData.append('uploadFile', blob, postedFileName);

        // Post the zipped cypress folder
        cy.multipartFormRequest('POST', postUrl, formData, function (response) {
            // expect(response.status).to.eq(expectedStatusCode);
            // also response.response
            // Cypress does not fail on these expects inside the callback, so we save the message on the server and get it later
        });

        cy.wait(100); // wait for the callback

        // Now validate that the multipart post worked by getting the stored response to the multipart post
        cy.request({
            url: `${postUrl}/message`,
            failOnStatusCode: true,
            retryOnStatusCodeFailure: true,
            method: 'GET',
        }).then((response) => {
            const expectedMessageRE = new RegExp(expectedMessage);
            expect(response.body.message).to.match(expectedMessageRE);
            expect(response.status).to.eq(200);
            expect(response.body.status).to.eq(expectedStatusCode);
            expect(response.headers['content-type']).to.eq('application/json; charset=utf-8');
            if (expectedStatusCode === 201) {
                const expectedFileNameRE = new RegExp(postedFileName);
                expect(response.body.info.name).to.match(expectedFileNameRE);
                expect(response.body.message).to.match(/version.json/);
            }
        });

        // Here we also confirm that the POST request succeeded by reading back the version number we posted
        cy.request({
            url: `${postUrl}?noRun=1`,
            failOnStatusCode: false,
        }).then((response) => {
            const re = new RegExp(version);
            expect(JSON.stringify(response.body.info.version)).to.match(re);
        });
    });
});

Cypress.Commands.add('httpGet', function (path, expectedStatus, expectedContent, notExpectedContent = 'w1lln0tbef0ound') {
    const baseUrl = Cypress.config().baseUrl;
    const getUrl = `${baseUrl}${path}`;

    const expectedRE = new RegExp(expectedContent);
    const notExpectedRE = new RegExp(notExpectedContent);

    cy.request({
        url: getUrl,
        failOnStatusCode: false,
        method: 'GET',
        timeout: 90000,
    }).then((response) => {
        expect(JSON.stringify(response.body)).to.match(expectedRE);
        expect(JSON.stringify(response.body)).to.not.match(notExpectedRE);
        expect(response.status).to.eq(expectedStatus);
    });
});

Cypress.Commands.add('httpGetRetry', function (path, expectedStatus, expectedContent, retryMax = 180, waitMs = 5000) {
    const baseUrl = Cypress.config().baseUrl;
    const getUrl = `${baseUrl}${path}`;
    const expectedRE = new RegExp(expectedContent);

    const options = {
        url: getUrl,
        failOnStatusCode: false,
        method: 'GET',
    };

    let retries = 0;

    function makeRequest() {
        retries++;
        return cy.request(options).then(function (response) {
            if (expectedRE.test(JSON.stringify(response.body))) {
                cy.log(`Expected content found on attempt ${retries}`);
            } else {
                if (retries === retryMax) {
                    cy.log(`Retried too many times (${retries}), giving up.`);
                } else {
                    cy.log(`Did not find ${expectedContent} in:`);
                    cy.log(JSON.stringify(response.body));
                    cy.log(`Attempt ${retries} failed, waiting ${waitMs} ms then trying again.`);
                    cy.wait(waitMs);
                    return makeRequest();
                }
            }
        });
    }

    makeRequest().then((response) => {
        expect(JSON.stringify(response.body)).to.match(expectedRE);
        expect(response.status).to.eq(expectedStatus);
    });
});
