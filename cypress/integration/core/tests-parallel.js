const u = require('../../util/util.js');

describe('Tests', function () {
    beforeEach(() => {
        cy.checkPing();
    });

    it('kicks off all suites in an app to run in parallel', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/purple/cypress-backend-app', 'cypress-backend-app.zip', 'v3.3.221');
        cy.httpGet(`/tests/purple/cypress-backend-app/parallel?group=${group}&interval=1500&noVideo=1`, 200, 'kicked off');
        cy.httpGetRetry(`/tests/purple/cypress-backend-app/summary`, 200, `All tests passed.`);
        cy.httpGet('/tests/purple/cypress-backend-app/summary', 200, 'canary');
        cy.httpGet('/tests/purple/cypress-backend-app/summary', 200, 'core-api');
    });

    it('returns an error if you try to use the same group twice', function () {
        const group = u.rndGroup();
        cy.postTests('/tests/purple/cypress-backend-app', 'cypress-backend-app.zip', 'v3.3.222');
        cy.httpGet(`/tests/purple/cypress-backend-app/parallel?group=${group}&interval=1500&noVideo=1`, 200, 'kicked off');
        cy.httpGetRetry(`/tests/purple/cypress-backend-app/summary`, 200, `All tests passed.`);
        cy.httpGet(`/tests/purple/cypress-backend-app/parallel?group=${group}&interval=150&noVideo=1`, 500, 'with errors');
    });

    it('does not require you to specify a group', function () {
        cy.postTests('/tests/purple/cypress-backend-app', 'cypress-backend-app.zip', 'v3.3.223');
        cy.httpGet(`/tests/purple/cypress-backend-app/parallel?interval=200&noVideo=1`, 200, 'kicked off');
        cy.httpGetRetry(`/tests/purple/cypress-backend-app/summary`, 200, `All tests passed.`);
    });
});
