/// <reference types="cypress" />
describe('Ping page', () => {
    it('Ping page confirms server is up', () => {
        cy.visit('http://localhost:4567/ping');
        cy.get('body').contains('cypress-service is up!').should('exist');
    });
});
