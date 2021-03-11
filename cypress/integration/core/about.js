/// <reference types="cypress" />
describe('About page', () => {
    it('About page shows version', () => {
        cy.visit('http://localhost:3950/about');
        cy.get('body').then(($body) => {
            cy.log($body.html());
            expect($body.html()).to.match(/cypress-service version [0-9]/);
        });
    });
});
