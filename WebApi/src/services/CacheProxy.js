import { EsProxy } from './index.js'

const TAGS_HASH_NAME = 'tags'

export const removeMetaId = (redis, metaId) => { redis.DEL(`meta:${metaId}`) }

export const addTag = async (redis, elasticSearch, fileId, tag) => {
    await EsProxy.indexTag(elasticSearch, fileId, tag)
    if (await hasTagsInRedis(redis)) {
        const filesCount = await getTagFilesCount(redis, tag.name, tag.type)
        await setTagFilesCount(redis, tag.name, tag.type, filesCount + 1)
    }
    return await getTags(redis, elasticSearch)
}

export const removeTag = async (redis, elasticSearch, fileId, tag) => {
    await EsProxy.deleteTag(elasticSearch, fileId, tag)
    if (await hasTagsInRedis(redis)) {
        const filesCount = await getTagFilesCount(redis, tag.name, tag.type)
        await setTagFilesCount(redis, tag.name, tag.type, filesCount - 1)
    }
    return await getTags(redis, elasticSearch)
}

const transformTagsStat = (redisResp) => !redisResp ? [] : Object.entries(redisResp).map(([tagName, tagValue]) => ({
    name: tagName.split(' ')[1],
    type: tagName.split(' ')[0],
    filesCount: parseInt(tagValue)
})).sort((tagA, tagB) => tagB.filesCount - tagA.filesCount)

const hasTagsInRedis = async (redis) => await redis.EXISTS(TAGS_HASH_NAME) === 1

const getTagFilesCount = async (redis, tagName, tagType) => {
    const filesCount = await redis.HGET(TAGS_HASH_NAME, `${tagType} ${tagName}`)
    return !filesCount ? 0 : parseInt(filesCount)
}

const setTagFilesCount = async (redis, tagName, tagType, filesCount) => {
    if (filesCount == 0) {
        await redis.HDEL(TAGS_HASH_NAME, `${tagType} ${tagName}`)
    } else {
        await redis.HSET(TAGS_HASH_NAME, `${tagType} ${tagName}`, filesCount)
    }
}

export const getTags = async (redis, elasticSearch) => {
    const hasTags = await hasTagsInRedis(redis)
    if (!hasTags) {
        await setTagsFromEs(redis, elasticSearch)
    }
    const redisResult = await redis.HGETALL(TAGS_HASH_NAME)
    return transformTagsStat(redisResult)
}

const setTagsFromEs = async (redis, elasticSearch) => {
    const tags = await EsProxy.getTagsStat(elasticSearch)
    if (tags.length == 0) {
        return
    }

    for (const tag of tags) {
        await setTagFilesCount(redis, tag.name, tag.type, tag.filesCount)
    }
}
