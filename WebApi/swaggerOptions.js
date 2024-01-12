import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';

const options = {
  definition: {
    openapi: '3.0.0', // specify the OpenAPI version
    info: {
      title: 'Ambar WebApi',
      version: '1.0.0',
      description: 'The Ambar Cloud WebApi',
    },
  },
  apis: ['./src/api/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

// Save the generated swaggerSpec to a file
const filePath = './swagger.json';
fs.writeFileSync(filePath, JSON.stringify(swaggerSpec, null, 2));

console.log("Saved swagger.json file to:", filePath)

export default swaggerSpec;