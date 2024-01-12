import { Router } from 'express'
import ErrorResponse from '../utils/ErrorResponse.js'
import {
    CryptoService,
    EsProxy,
    GridFsProxy,
    MongoProxy,
    FileUploader,
    QueueProxy,
    CacheProxy
} from '../services/index.js'

import * as MetaBuilder from '../utils/MetaBuilder.js'

import config from '../config.js'
import axios from 'axios'
import { promisify } from 'util';
import * as stream from 'stream'
import { basename } from 'path'

const DOWNLOAD_URL_REGEX = /^\/\/([^/]+)\/(.*)$/i

const generateFileId = (source_id, full_name) => {
    return CryptoService.getSha256(`${source_id}${full_name}`)
}

const generateExtractedTextFileName = (sha) => `text_${sha}`

/**
 * @swagger
 * tags:
 *   - name: Files
 *     description: API for managing files
 */

export default ({ storage }) => {
    let api = Router()
    
    /**
     * @swagger
     * /api/files/download:
     *   get:
     *     summary: Download file by SHA or URL
     *     description: Download a file by its SHA or URL.
     *     tags:
     *       - Files
     *     parameters:
     *       - in: query
     *         name: path
     *         description: Path to the file (for URLs).
     *         required: false
     *         schema:
     *           type: string
     *       - in: query
     *         name: sha
     *         description: SHA256 hash of the file.
     *         required: false
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: File download successful.
     *       400:
     *         description: Bad request.
     *       404:
     *         description: File content not found.
     */

    api.get('/download', (req, res, next) => {
        const filePath = req.query.path
        const sha = req.query.sha

        if (!filePath && !sha) {
            res.sendStatus(400)
            return
        }

        if (sha) {
            GridFsProxy.checkIfFileExists(storage.mongoDb, sha)
                .then(fileExsists => {
                    if (!fileExsists) {
                        res.status(404).json(new ErrorResponse('File content not found'))
                        return
                    }

                    res.writeHead(200, {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(sha)}`
                    })

                    GridFsProxy
                        .downloadFile(storage.mongoDb, sha)
                        .on('error', (err) => {
                            console.log('err during downloading by sha', err)
                            res.end()
                        })
                        .pipe(res)
                })
                .catch(next)

        } else if (filePath) {
            const match = DOWNLOAD_URL_REGEX.exec(filePath)

            if (!match) {
                res.sendStatus(400)
                return
            }

            const [, crawlerName, crawlerFilePath] = match

            const crawlerFileName = basename(crawlerFilePath)

            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename*=UTF-8''${crawlerFileName}`
            })

            axios
                .get(`http://${crawlerName}:${config.crawlerPort}/api/download?path=${encodeURIComponent(crawlerFilePath)}`, { responseType: 'stream' })
                .then(response => {
                    response.data.pipe(res)
                    return promisify(stream.finished)
                })
                .catch(next)
        }
    })

    //////////////// CALLED FROM UI ///////////////////////////////////////////   
    /**     
      * @api {get} api/files/:uri Download File Content by Secure Uri    
      * @apiGroup Files                
      *  
      * @apiSuccessExample HTTP/1.1 200 OK     
      * Octet-Stream
      * 
      * @apiErrorExample {json} HTTP/1.1 404 Not Found
      * File meta or content not found
      */

    /**
     * @swagger
     * /api/files/{id}:
     *   get:
     *     summary: Download file by file ID
     *     description: Download a file by its ID.
     *     tags:
     *       - Files
     *     parameters:
     *       - in: path
     *         name: id
     *         description: File ID.
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: File download successful.
     *       400:
     *         description: Uri is broken.
     *       404:
     *         description: File meta not found or file content not found.
     */
    api.get('/:id', (req, res, next) => {
        const uri = req.params.id

        let result

        try {
            result = CryptoService.decryptDownloadUri(uri)
        } catch (err) {
            res.status(400).json(new ErrorResponse('Uri is broken'))
            return
        }

        const { fileId } = result

        EsProxy.getFileByFileId(storage.elasticSearch, fileId)
            .then(file => {
                if (file === null) {
                    res.status(404).json(new ErrorResponse('File meta not found'))
                    return
                }

                return GridFsProxy.checkIfFileExists(storage.mongoDb, file.sha256)
                    .then(fileExsists => ({
                        fileExsists: fileExsists,
                        fileMeta: file.meta,
                        fileSha: file.sha256,
                        fileType: file.content.type
                    }))
                    .then(result => {
                        if (!result.fileExsists) {
                            res.status(404).json(new ErrorResponse('File content not found'))
                            return
                        }

                        const { fileMeta: { short_name: fileName }, fileSha, fileType } = result

                        res.writeHead(200, {
                            'Content-Type': fileType,
                            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
                        })

                        GridFsProxy.downloadFile(storage.mongoDb, fileSha).pipe(res)
                    })
            })
            .catch(next)
    })

    /**     
      * @api {get} api/files/:uri/text Download Parsed Text by Secure Uri    
      * @apiGroup Files                
      *  
      * @apiSuccessExample HTTP/1.1 200 OK     
      * Octet-Stream
      * 
      * @apiErrorExample {json} HTTP/1.1 404 Not Found
      * File meta or content not found
      */

    /**
     * @swagger
     * /api/files/{id}/text:
     *   get:
     *     summary: Download parsed text by file ID
     *     description: Download parsed text of a file by its ID.
     *     tags:
     *       - Files
     *     parameters:
     *       - in: path
     *         name: id
     *         description: File ID.
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Parsed text download successful.
     *       400:
     *         description: Uri is broken.
     *       404:
     *         description: File meta not found or parsed content not found.
     */
    api.get('/:id/text', (req, res, next) => {
        const uri = req.params.id

        let result
        try {
            result = CryptoService.decryptDownloadUri(uri)
        } catch (err) {
            res.status(400).json(new ErrorResponse('Uri is broken'))
            return
        }

        const { fileId } = result

        EsProxy.getFileByFileId(storage.elasticSearch, fileId)
            .then(file => {
                if (file === null) {
                    res.status(404).json(new ErrorResponse('File meta not found'))
                    return
                }

                const extractedTextFileName = generateExtractedTextFileName(file.sha256)

                return GridFsProxy.checkIfFileExists(storage.mongoDb, extractedTextFileName)
                    .then(fileExsists => ({
                        fileExsists: fileExsists,
                        fileMeta: file.meta,
                        fileType: 'text/plain'
                    }))
                    .then(result => {
                        if (!result.fileExsists) {
                            res.status(404).json(new ErrorResponse('Parsed content not found'))
                            return
                        }

                        const { fileMeta: { short_name: fileName }, fileType } = result

                        res.writeHead(200, {
                            'Content-Type': fileType,
                            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${fileName}.txt`)}`
                        })

                        GridFsProxy.downloadFile(storage.mongoDb, extractedTextFileName).pipe(res)
                    })
            })
            .catch(next)
    })

    /**     
        * @api {post} api/files/uiupload/:filename Upload File  
        * @apiGroup Files      
        * @apiDescription New source named `uiupload` with description `Automatically created on UI upload` will be created if source didn't exist.
        *          
        * @apiHeader {String} ambar-email User email
        * @apiHeader {String} ambar-email-token User token
        * 
        * @apiExample {curl} Upload File test.txt
        * curl -X POST \
        * http://ambar_api_address/api/files/uiupload/test.txt \
        * -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \  
        * -F file=@test.txt
        * 
        * @apiSuccessExample {json} HTTP/1.1 200 OK     
        * { "fileId": xxxxx }
        * 
        * @apiErrorExample {json} HTTP/1.1 400 Bad Request
        * Wrong request data
        * 
        * @apiErrorExample {json} HTTP/1.1 404 Not Found
        * File meta or content not found
        */

    /**
     * @swagger
     * /api/files/uiupload/{fileName}:
     *   post:
     *     summary: Upload file from UI
     *     description: Upload a file from the UI.
     *     tags:
     *       - Files
     *     parameters:
     *       - in: path
     *         name: fileName
     *         description: Name of the file.
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       description: File to upload.
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *     responses:
     *       200:
     *         description: File upload successful.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 fileId:
     *                   type: string
     *       400:
     *         description: Wrong request data.
     *       404:
     *         description: File meta or content not found.
     */
    api.post('/uiupload/:fileName', FileUploader, (req, res, next) => {
        let { params: { fileName: fileName }, files } = req

        const sourceId = 'ui-upload'
        const fileContent = (Buffer.isBuffer(files[0].buffer) && Buffer.byteLength(files[0].buffer) > 0) ? files[0].buffer : Buffer.alloc(0)
        const size = Buffer.byteLength(fileContent)

        if (size == 0) {
            res.status(400).json(new ErrorResponse('File is empty!'))
            return
        }

        const sha = CryptoService.getSha256(fileContent)
        const meta = MetaBuilder.buildShortMeta(fileName, sourceId)

        MongoProxy.getBucketById(storage.mongoDb, sourceId)
            .then(bucket => {
                if (!bucket) {
                    return MongoProxy.createBucket(storage.mongoDb, { id: sourceId, description: 'Automatically created on UI upload' })
                }
                return true
            })
            .then(() => GridFsProxy.checkIfFileExists(storage.mongoDb, sha))
            .then(found => {
                if (!found) {
                    return GridFsProxy.uploadFile(storage.mongoDb, sha, fileContent)
                }
            })
            .then(() => QueueProxy.enqueuePipelineMessage(storage, { event: 'add', sha: sha, fileId: generateFileId(meta.source_id, meta.full_name), sourceId: sourceId, meta: meta }))
            .then(() => {
                res.status(200).json({ fileId: generateFileId(meta.source_id, meta.full_name) })
            })
            .catch(next)
    })

    /**     
        * @api {put} api/files/hide/:fileId Hide File  
        * @apiGroup Files      
        * @apiDescription Hide file by file id
        *  
        * @apiHeader {String} ambar-email User email
        * @apiHeader {String} ambar-email-token User token
        * 
        * @apiSuccessExample {json} HTTP/1.1 200 OK     
        * {}
        * 
        * @apiErrorExample {json} HTTP/1.1 404 NotFound
        * File not found
        */
    /**
     * @swagger
     * /api/files/hide/{fileId}:
     *   put:
     *     summary: Hide file by file ID
     *     description: Hide a file by its ID.
     *     tags:
     *       - Files
     *     parameters:
     *       - in: path
     *         name: fileId
     *         description: File ID.
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: File hide successful.
     *       404:
     *         description: File not found.
     */
    api.put('/hide/:fileId', (req, res, next) => {
        const fileId = req.params.fileId

        EsProxy.getFileByFileId(storage.elasticSearch, fileId)
            .then(file => {
                if (!file) {
                    res.sendStatus(404)
                    return
                }

                CacheProxy.removeMetaId(storage.redis, file.meta.id)

                return EsProxy.hideFile(storage.elasticSearch, file.file_id)
                    .then(() => res.sendStatus(200))
            })
            .catch(next)
    })

    /**     
        * @api {put} api/files/unhide/:fileId Unhide File  
        * @apiGroup Files      
        * @apiDescription Unhide file by file id
        *  
        * @apiHeader {String} ambar-email User email
        * @apiHeader {String} ambar-email-token User token
        * 
        * @apiSuccessExample {json} HTTP/1.1 200 OK     
        * {}
        * 
        * @apiErrorExample {json} HTTP/1.1 404 NotFound
        * File not found
        */
    /**
     * @swagger
     * /api/files/unhide/{fileId}:
     *   put:
     *     summary: Unhide file by file ID
     *     description: Unhide a file by its ID.
     *     tags:
     *       - Files
     *     parameters:
     *       - in: path
     *         name: fileId
     *         description: File ID.
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: File unhide successful.
     *       404:
     *         description: File not found.
     */
    api.put('/unhide/:fileId', (req, res, next) => {
        const fileId = req.params.fileId

        EsProxy.unHideFile(storage.elasticSearch, fileId)
            .then(() => res.sendStatus(200))
            .catch(err => {
                if ((err.statusCode) && (err.statusCode == 404)) {
                    res.sendStatus(404)
                    return
                }

                next(err)
            })
    })

    return api
}