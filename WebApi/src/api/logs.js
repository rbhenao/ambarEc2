import { Router } from 'express'
import ErrorResponse from '../utils/ErrorResponse.js'
import * as EsProxy from '../services/EsProxy/EsProxy.js'

const DEFAULT_RECORDS_COUNT = 10
const MAX_RECORDS_COUNT = 100

/**
 * @swagger
 * tags:
 *   - name: Logs
 *     description: API for managing log records
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LogItem:
 *       type: object
 *       properties:
 *         // Define properties of LogItem here
 */

export default ({ storage }) => {
    let api = Router()

    /**
   * @swagger
   * path:
   *   /logs:
   *     post:
   *       summary: Submit log record
   *       description: Submit a log record to the server.
   *       tags:
   *         - Logs
   *       requestBody:
   *         description: LogItem object
   *         required: true
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LogItem'
   *       responses:
   *         200:
   *           description: Successful response
   */
    
    api.post('/', (req, res) => {
        const { body: logItem } = req

        if (!logItem) {
            res.status(400).json(new ErrorResponse('Bad request'))
            return
        }

        res.sendStatus(200) //Immediately send response
        EsProxy.indexLogItem(storage.elasticSearch, logItem)
    })

    /**
   * @swagger
   * path:
   *   /logs:
   *     get:
   *       summary: Get log records
   *       description: Retrieve log records from the server.
   *       tags:
   *         - Logs
   *       parameters:
   *         - name: recordsCount
   *           in: query
   *           description: Number of records to retrieve
   *           required: false
   *           schema:
   *             type: integer
   *             minimum: 1
   *             maximum: 100
   *             default: 10
   *       responses:
   *         200:
   *           description: Successful response with log records
   *           content:
   *             application/json:
   *               // Define the response schema here
   */
    api.get('/', (req, res, next) => {
        const { query: { recordsCount = DEFAULT_RECORDS_COUNT } } = req

        if (recordsCount > MAX_RECORDS_COUNT && recordsCount <= 0) {
            res.status(400).json(new ErrorResponse(`RecordsCount should be greater than 0 and lower than ${MAX_RECORDS_COUNT}`))
            return
        }

        EsProxy.getLastLogRecords(storage.elasticSearch, recordsCount)
            .then(response => res.status(200).json(response))
            .catch(next)
    })

    return api
}
