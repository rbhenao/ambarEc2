import { Router } from 'express'
import fs from 'fs'
import files from './files.js'
import logs from './logs.js'
import search from './search.js'
import stats from './stats.js'
import thumbs from './thumbs.js'
import tags from './tags.js'
import swagger from './swagger.js'

export default ({ config, storage }) => {
	let api = Router()

	api.use('/', (req, res, next) => {
		const originalSend = res.send;
		res.send = function () {
		  // Log the response headers here
		  console.log('Response Headers:', res.getHeaders());
		  originalSend.apply(res, arguments);
		};
		next();
	  });

	api.use('/files', files({ config, storage }))
	api.use('/logs', logs({ config, storage }))
	api.use('/search', search({ config, storage }))
	api.use('/stats', stats({ config, storage }))
	api.use('/thumbs', thumbs({ config, storage }))
	api.use('/tags', tags({ config, storage }))
	api.use('/swagger', swagger())

	
	/**
	 * @swagger
	 * /api:
	 *   get:
	 *     summary: Get information about the API
	 *     description: Returns information about the API, including version, UI language, and raw configuration.
	 *     tags:
	 *       - General
	 *     responses:
	 *       200:
	 *         description: Successful response with API information.
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 version:
	 *                   type: string
	 *                   description: The version of the API.
	 *                 uiLang:
	 *                   type: string
	 *                   description: The UI language used.
	 *                 rawConfig:
	 *                   type: object
	 *                   description: The raw configuration of the API.
	 *     produces:
	 *       - application/json
	 */
	api.get('/', (req, res) => {
		// Use JSON imports once they're stable within Node
		const meta = JSON.parse(fs.readFileSync('../../package.json', 'utf8'))
				res.json({
			version: meta.version,							
			uiLang: config.uiLang,
			rawConfig: config
		})
	})

	return api
}
