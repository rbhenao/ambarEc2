import { Router } from 'express'
import ErrorResponse from '../utils/ErrorResponse.js'
import {
    MongoProxy,
    CacheProxy
} from '../services/index.js'

const AUTO_TAG_TYPE = 'auto'
const SOURCE_TAG_TYPE = 'source'

export default ({ storage }) => {
    let api = Router()

    /**
    * Add tag for specified file id
    */
    api.post('/service/:fileId/:tagType/:tagName', (req, res, next) => {
        const { params: { fileId, tagName, tagType } } = req

        if (!tagName || !fileId || !tagType || ((tagType.toLowerCase() != AUTO_TAG_TYPE) && (tagType.toLowerCase() != SOURCE_TAG_TYPE))) {
            res.status(400).json(new ErrorResponse('Required field is missing'))
            return
        }

        const type = tagType.toLowerCase()

        const tag = {
            type: type,
            name: tagName.toLowerCase()
        }

        CacheProxy.addTag(storage.redis, storage.elasticSearch, fileId, tag)
            .then(() => {
                res.sendStatus(200)
            })
            .catch(next)
    })

    /**
    * Get tagging rules
    */
    api.get('/service/taggingrules', (req, res, next) => {
        MongoProxy.getTaggingRules(storage.mongoDb)
            .then(rules => {
                res.status(200).json(rules)
            })
            .catch(next)
    })

    return api
}