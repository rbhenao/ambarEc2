import { Router } from 'express'
import * as MongoProxy from '../services/MongoProxy.js'

export default ({ storage }) => {
    let api = Router()
   
    /**     
     * @api {get} api/thumbs/:id Get Thumbnail by Id   
     * @apiGroup Thumbnails                
     *  
     * @apiSuccessExample HTTP/1.1 200 OK     
     * Octet-Stream
     * 
     * @apiErrorExample {json} HTTP/1.1 404 NotFound
     * HTTP/1.1 404 NotFound
     */

    /**
     * @swagger
     * /api/thumbs/{id}:
     *   get:
     *     summary: Get Thumbnail by Id
     *     description: Retrieve a thumbnail by its ID.
     *     tags:
     *       - Thumbnails
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The ID of the thumbnail to retrieve.
     *     responses:
     *       200:
     *         description: Successful response with the thumbnail image.
     *         content:
     *           image/jpeg:
     *             schema:
     *               type: string
     *               format: binary
     *       404:
     *         description: Not Found. The requested thumbnail ID does not exist.
     */
    api.get('/:id', (req, res, next) => {
        const {params: {id: thumbId}} = req

        MongoProxy.getThumbnailById(storage.mongoDb, thumbId)
            .then((thumb) => {
                if (!thumb) {
                    res.sendStatus(404)
                    return
                }

                res.status(200)
                    .header({
                        'Content-Type': 'image/jpeg',
                        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(thumbId)}.jpeg`
                    })
                    .send(thumb.data.buffer)
            })
            .catch(next)
    })

    return api
}