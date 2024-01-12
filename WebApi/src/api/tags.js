import { Router } from 'express'
import ErrorResponse from '../utils/ErrorResponse.js'
import { CacheProxy } from '../services/index.js'

const MANUAL_TAG_TYPE = 'manual'

export default ({ storage }) => {
    let api = Router()

    //////////////// CALLED FROM UI ////////////////////////////////////
    /**     
     * @api {get} api/tags/ Get Tags 
     * @apiGroup Tags                
     *  
     * @apiHeader {String} ambar-email User email
     * @apiHeader {String} ambar-email-token User token
     * 
     * 
     * @apiSuccessExample HTTP/1.1 200 OK     
[  
      {  
         "name":"ocr",
         "filesCount":3
      },
      {  
         "name":"test",
         "filesCount":2
      },
      {  
         "name":"pdf",
         "filesCount":1
      }
]
     * 
     */
    /**
     * @swagger
     * /api/tags:
     *   get:
     *     summary: Get Tags
     *     description: Retrieve a list of tags along with the count of associated files.
     *     tags:
     *       - Tags
     *     responses:
     *       200:
     *         description: Successful response with an array of tags and their associated file counts.
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   name:
     *                     type: string
     *                     description: The name of the tag.
     *                   filesCount:
     *                     type: integer
     *                     description: The count of files associated with the tag.
     *       500:
     *         description: Internal Server Error. Failed to retrieve tags.
     */
    api.get('/', (req, res, next) => {
        CacheProxy.getTags(storage.redis, storage.elasticSearch)
            .then(tags => {
                res.status(200).json(tags)
            })
            .catch(next)
    })

    /**     
        * @api {post} api/tags/:fileId/:tagType/:tagName Add Tag For File   
        * @apiGroup Tags                
        *  
        * @apiHeader {String} ambar-email User email
        * @apiHeader {String} ambar-email-token User token
        * 
        * @apiParam {String} fileId     File Id to add tag to.
        * @apiParam {String} tagType    Tag type to add.
        * @apiParam {String} tagName    Tag name to add.
        * 
        * @apiSuccessExample HTTP/1.1 200 OK     
   {  
      "tags":[  
         {  
            "name":"ocr",
            "filesCount":3
         },
         {  
            "name":"test",
            "filesCount":2
         },
         {  
            "name":"pdf",
            "filesCount":1
         }
      ]
   }
        * 
        */
    /**
     * @swagger
     * /api/tags/{fileId}/{tagType}/{tagName}:
     *   post:
     *     summary: Add Tag For File
     *     description: Add a tag for a specific file.
     *     tags:
     *       - Tags
     *     parameters:
     *       - in: path
     *         name: fileId
     *         required: true
     *         schema:
     *           type: string
     *         description: The ID of the file to add the tag to.
     *       - in: path
     *         name: tagType
     *         required: true
     *         schema:
     *           type: string
     *         description: The type of the tag to add.
     *       - in: path
     *         name: tagName
     *         required: true
     *         schema:
     *           type: string
     *         description: The name of the tag to add.
     *     requestBody:
     *       required: false
     *     responses:
     *       200:
     *         description: Successful response with updated tags.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 tags:
     *                   type: array
     *                   items:
     *                     type: object
     *       400:
     *         description: Bad Request. Required field is missing or invalid tag type.
     *       500:
     *         description: Internal Server Error. Failed to add tag.
     */
    api.post('/:fileId/:tagType/:tagName', (req, res, next) => {
        const { params: { fileId, tagType, tagName } } = req

        if (!tagName || !fileId || !tagType || tagType.toLowerCase() != MANUAL_TAG_TYPE) {
            res.status(400).json(new ErrorResponse('Required field is missing'))
            return
        }

        const type = tagType.toLowerCase()

        const tag = {
            type: type.toLowerCase(),
            name: tagName.trim().toLowerCase()
        }

        CacheProxy.addTag(storage.redis, storage.elasticSearch, fileId, tag)
            .then(tags => {
                res.status(200).json({ tags: tags })
            })
            .catch(next)
    })

    /**     
      * @api {delete} api/tags/:fileId/:tagType/:tagName Delete Tag From File   
      * @apiGroup Tags                
      *  
      * @apiHeader {String} ambar-email User email
      * @apiHeader {String} ambar-email-token User token
      * 
      * @apiParam {String} fileId     File Id to delete tag from.
      * @apiParam {String} tagType    Tag type to delete.
      * @apiParam {String} tagName    Tag name to delete.
      * 
      * @apiSuccessExample HTTP/1.1 200 OK     
 {  
    "tags":[  
        {  
          "name":"ocr",
          "filesCount":3
       },
       {  
          "name":"test",
          "filesCount":2
       },
       {  
          "name":"pdf",
          "filesCount":1
       }
    ]
 }   
      * 
      */
    /**
     * @swagger
     * /api/tags/{fileId}/{tagType}/{tagName}:
     *   delete:
     *     summary: Delete Tag From File
     *     description: Delete a tag from a specific file.
     *     tags:
     *       - Tags
     *     parameters:
     *       - in: path
     *         name: fileId
     *         required: true
     *         schema:
     *           type: string
     *         description: The ID of the file to delete the tag from.
     *       - in: path
     *         name: tagType
     *         required: true
     *         schema:
     *           type: string
     *         description: The type of the tag to delete.
     *       - in: path
     *         name: tagName
     *         required: true
     *         schema:
     *           type: string
     *         description: The name of the tag to delete.
     *     responses:
     *       200:
     *         description: Successful response with updated tags.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 tags:
     *                   type: array
     *                   items:
     *                     type: object
     *       400:
     *         description: Bad Request. Required field is missing.
     *       500:
     *         description: Internal Server Error. Failed to delete tag.
     */
    api.delete('/:fileId/:tagType/:tagName', (req, res, next) => {
        const { params: { fileId, tagType, tagName } } = req

        if (!fileId || !tagName || !tagType) {
            res.status(400).json(new ErrorResponse('Required field is missing'))
            return
        }

        const type = tagType.toLowerCase()

        const tag = {
            type: type.toLowerCase(),
            name: tagName.trim().toLowerCase()
        }

        CacheProxy.removeTag(storage.redis, storage.elasticSearch, fileId, tag)
            .then(tags => {
                res.status(200).json({ tags: tags })
            })
            .catch(next)
    })

    return api
}