import { Router } from 'express'
import swaggerUi from 'swagger-ui-express';
import fs from 'fs'

export default () => {
    let api = Router();

    // Serve Swagger UI
    api.use('/ui', swaggerUi.serve);

    // Provide Swagger UI HTML
    api.get('/ui', swaggerUi.setup(null, { swaggerOptions: { url: '/api/swagger/json' } }));

    // Serve Swagger JSON
    api.get('/json', (req, res) => {
        const swaggerJson = JSON.parse(fs.readFileSync('/swagger.json', 'utf8'));
        res.json(swaggerJson);
        //res.json({});
    });

    return api;
}