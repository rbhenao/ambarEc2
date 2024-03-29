const FULL_FILE_FRAGMENT_SIZE = 10 * 1024 * 1024
const FRAGMENT_SIZE = 500
const NUMBER_OF_FRAGMENTS = 50
const PHRASE_LIMIT = 1024
const LARGE_FILE_SIZE_BYTES = 50000000
const MAX_TAGS_TO_RETRIEVE_IN_AGG = 50

/////////////////////////////////////// Tags queries ///////////////////////////////////////////////////////

export const getTagsStatsQuery = () => (
    {
        from: 0,
        size: 0,
        aggs: {
            tags: {
                nested: { path: 'tags' },
                aggs: {
                    tags: {
                        terms: { field: 'tags.name' },
                        aggs: { type: { terms: { field: 'tags.type' } } }
                    }
                }
            }
        }
    })

/////////////////////////////////////// Stats queries ///////////////////////////////////////////////////////

export const getStatsQuery = () => (
    {
        from: 0,
        size: 0,
        aggs: {
            content_type: {
                terms: { field: "content.type" },
                aggs: {
                    size: { stats: { field: "content.size" } }
                }
            },
            proc_rate: {
                date_histogram: {
                    field: "indexed_datetime",
                    calendar_interval: "day"
                },
                aggs: {
                    source: {
                        terms: { field: "meta.source_id" }
                    }
                }
            },
            proc_total: {
                stats: { field: "content.size" }
            }
        }
    }
)

export const getProcessingStatsQuery = () => (
    {
        from: 0,
        size: 0,
        aggs: {
            hours: {
                date_histogram: {
                    field: "indexed_datetime",
                    calendar_interval: "hour",
                    format: "HH dd.MM.yyyy",
                    order: { "_key": "desc" }
                },
                aggs: {
                    size: {
                        sum: { field: "content.size" }
                    }
                }
            },
            days: {
                date_histogram: {
                    field: "indexed_datetime",
                    calendar_interval: "day",
                    format: "dd.MM.yyyy",
                    order: { _key: "desc" }
                },
                ggs: {
                    size: {
                        sum: { field: "content.size" }
                    }
                }
            },
            months: {
                date_histogram: {
                    field: "indexed_datetime",
                    calendar_interval: "month",
                    format: "MM.yyyy",
                    order: { _key: "desc" }
                },
                aggs: {
                    size: {
                        sum: { field: "content.size" }
                    }
                }
            }
        }
    }
)
/////////////////////////////////////// Search queries //////////////////////////////////////////////////////

export const getFilesWithHighlightsQuery = (request, from, size) => getFilesQuery(request, from, size, true, false, true)
export const getFilesWithoutHighlightsQuery = (request, from, size) => getFilesQuery(request, from, size, false, true, false)
export const getFileHighlightQuery = (request, fileId) => getFilesQuery(request, 0, 1, false, false, true, fileId)
export const getFullFileHighlightQuery = (request, fileId) => getFilesQuery(request, 0, 1, false, false, true, fileId, true)
export const getFilesTreeQuery = (request) => {
    const { mustList } = getBoolSubqueries(request, false, false)

    return {
        from: 0,
        size: 0,
        query: {
            bool: {
                must: mustList
            }
        },
        aggs: {
            full_name_parts: {
                terms: {
                    field: 'meta.full_name_parts',
                    size: 200
                },
                aggs: {
                    file_id: {
                        terms: {
                            field: 'file_id',
                            size: 1
                        }
                    },
                    thumb_available: {
                        terms: {
                            field: 'content.thumb_available',
                            size: 1
                        }
                    },
                    content_type: {
                        terms: {
                            field: 'content.type',
                            size: 1
                        }
                    },
                    sha256: {
                        terms: {
                            field: 'sha256',
                            size: 1
                        }
                    }
                }
            }
        }
    }
}
export const getFilesStatsQuery = (request, maxItemsToRetrieve) => {
    const { mustList } = getBoolSubqueries(request, false, false)

    return {
        from: 0,
        size: 0,
        query: {
            bool: {
                must: mustList
            }
        },
        aggs: {
            extensions: {
                terms: { field: "meta.extension" },
                aggs: {
                    size: { stats: { field: "content.size" } }
                }
            },
            summary: {
                stats: { field: "content.size" }
            },
            tags: {
                nested: { path: 'tags' },
                aggs: {
                    names: {
                        terms: {
                            field: 'tags.name',
                            size: maxItemsToRetrieve ?? MAX_TAGS_TO_RETRIEVE_IN_AGG
                        },
                        aggs: {
                            types: {
                                terms: {
                                    field: 'tags.type',
                                    size: 1
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

const isWildcardQuery = (query) => /[*?]/g.test(query)

const getBoolSubqueries = (queries, onlySmallFiles, onlyLargeFiles, fileId = null) => {
    const mustList = []
    const contentShouldList = []

    if (queries.content && queries.content != '') {
        contentShouldList.push({
            simple_query_string: {
                query: queries.content,
                fields: ['content.text', 'content.author.analyzed', 'meta.source_id.analyzed', 'meta.full_name.analyzed'],
                default_operator: 'and'
            }
        })
    }

    if (fileId && fileId != '') {
        mustList.push({ term: { file_id: fileId } })
    }

    if (onlySmallFiles) {
        mustList.push({ range: { 'content.size': { lt: LARGE_FILE_SIZE_BYTES } } })
    }

    if (onlyLargeFiles) {
        mustList.push({ range: { 'content.size': { gte: LARGE_FILE_SIZE_BYTES } } })
    }

    mustList.push({ term: { 'content.state': 'processed' } })

    if (queries.name && queries.name != '') {
        mustList.push(isWildcardQuery(queries.name) ? { wildcard: { 'meta.full_name': queries.name.toLowerCase() } } : { match: { 'meta.full_name.analyzed': queries.name } })
    }

    if (queries.author && queries.author != '') {
        mustList.push(isWildcardQuery(queries.author) ? { wildcard: { 'content.author': queries.author.toLowerCase() } } : { match: { 'content.author.analyzed': queries.author } })
    }

    if (queries.source && queries.source.length > 0) {
        const sourceShouldList = queries.source.map(source => (isWildcardQuery(source) ? { wildcard: { 'meta.source_id': source.toLowerCase() } } : { match: { 'meta.source_id.analyzed': source } }))
        mustList.push({
            bool: {
                should: sourceShouldList,
                minimum_should_match: 1
            }
        })
    }

    if (queries.size && queries.size.gte) {
        mustList.push({ range: { 'content.size': { gte: queries.size.gte } } })
    }

    if (queries.size && queries.size.lte) {
        mustList.push({ range: { 'content.size': { lte: queries.size.lte } } })
    }

    if (queries.when && queries.when.gte) {
        mustList.push({ range: { 'meta.updated_datetime': { gte: queries.when.gte } } })
    }

    if (queries.when && queries.when.lte) {
        mustList.push({ range: { 'meta.updated_datetime': { lte: queries.when.lte } } })
    }

    const hasTags = queries.tags && queries.tags.length > 0
    const hasNotTags = queries.notTags && queries.notTags.length > 0
    if (hasTags || hasNotTags) {
        const tagsPart = queries.tags?.map((tag) => ({
            nested: {
                path: 'tags',
                query: {
                    term: {
                        'tags.name': tag
                    }
                }
            }
        })) ?? []

        const notTagsPart = queries.notTags?.map((tag) => ({
            nested: {
                path: 'tags',
                query: {
                    term: {
                        'tags.name': tag
                    }
                }
            }
        })) ?? []

        const tagQuery = {
            bool: {
                must: tagsPart,
                must_not: notTagsPart
            }
        }

        mustList.push(tagQuery)
    }

    if (contentShouldList.length > 0) {
        mustList.push({
            bool: {
                should: contentShouldList,
                minimum_should_match: 1
            }
        })
    }

    if (queries.withoutHiddenMarkOnly) {
        mustList.push({
            term: {
                hidden: true
            }
        })
    }

    if (queries.withHiddenMarkOnly) {
        mustList.push({
            term: {
                hidden: false
            }
        })
    }

    return {
        mustList,
        contentShouldList
    }
}

const getFilesQuery = (queries, from, size, onlySmallFiles, onlyLargeFiles, includeContentHighlight, fileId = null, fullFileHighlight = false) => {
    const { mustList, contentShouldList } = getBoolSubqueries(queries, onlySmallFiles, onlyLargeFiles, fileId)

    let highlightFields = {
        'content.author': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS
        },
        'content.author.analyzed': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS
        },
        'meta.full_name': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS
        },
        'meta.source_id': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS
        },
        'meta.full_name.analyzed': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS
        },
        'meta.source_id.analyzed': {
            pre_tags: [''],
            post_tags: [''],
            fragment_size: FRAGMENT_SIZE,
            number_of_fragments: NUMBER_OF_FRAGMENTS
        }
    }

    if (includeContentHighlight) {
        highlightFields = {
            ...highlightFields, 'content.text': {
                highlight_query: {
                    bool: {
                        should: contentShouldList,
                        minimum_should_match: 1
                    }
                },
                type: 'fvh',
                fragment_size: fullFileHighlight ? FULL_FILE_FRAGMENT_SIZE : FRAGMENT_SIZE,
                number_of_fragments: fullFileHighlight ? 1 : NUMBER_OF_FRAGMENTS,
                phrase_limit: fullFileHighlight ? undefined : PHRASE_LIMIT,
                no_match_size: fullFileHighlight ? FULL_FILE_FRAGMENT_SIZE : FRAGMENT_SIZE
            }
        }
    }

    return {
        from: from,
        size: size,
        query: {
            bool: {
                must: mustList,
                minimum_should_match: 0
            }
        },
        highlight: {
            order: 'score',
            fields: highlightFields,
            require_field_match: true
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////