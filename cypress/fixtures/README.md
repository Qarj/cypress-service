# Updating the fixtures

Need to cd to parent folder before zipping or entire source path will be added

```
cd ~/git/cypress-frontend-app/
zip -r ~/git/cypress-service/cypress/fixtures/cypress-frontend-app.zip cypress
cd ~/git/cypress-backend-app/
zip -r ~/git/cypress-service/cypress/fixtures/cypress-backend-app.zip cypress
cd ~/git/cypress-big-app/
zip -r ~/git/cypress-service/cypress/fixtures/cypress-big-app.zip cypress
cd ~/git/cypress-service/cypress/fixtures
base64 cypress-frontend-app.zip > cypress-frontend-app.zip.base64
base64 cypress-backend-app.zip > cypress-backend-app.zip.base64
base64 cypress-big-app.zip > cypress-big-app.zip.base64
```
