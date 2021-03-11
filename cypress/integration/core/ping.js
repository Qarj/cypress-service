/// <reference types="cypress" />
describe('Ping page', () => {
    it('Ping page confirms server is up', () => {
        cy.visit('http://localhost:3950/ping');
        cy.get('body').contains('cypress-service is up!').should('exist');
    });
});
