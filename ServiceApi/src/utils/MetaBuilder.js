import { CryptoService, DateTimeService } from '../services/index.js'

const FILE_EXTENSION_REGEX = /(?:\.([^.]+))?$/

const generateMetaId = (source_id, full_name, created_datetime, updated_datetime) => {
    return CryptoService.getSha256(`${source_id}${full_name}${created_datetime}${updated_datetime}`)
}

export const buildMeta = (data) => {
    const { short_name, full_name, extension, extra, created_datetime, updated_datetime, source_id } = data

    if (!short_name
        || !full_name
        || !source_id
        || !extension
        || !created_datetime
        || !updated_datetime) {
        return null
    }

    const meta = {
        id: generateMetaId(source_id, full_name, created_datetime, updated_datetime),
        short_name: short_name,
        full_name: full_name,
        source_id: source_id,
        extension: extension,
        created_datetime: created_datetime,
        updated_datetime: updated_datetime,
        extra: extra,
        indexed_datetime: DateTimeService.getCurrentDateTime()
    }

    return meta
}

export const buildShortMeta = (shortName, sourceId) => {

    const short_name = shortName
    const full_name = `//${sourceId}/${shortName}`
    const source_id = sourceId
    let extension = ''
    let calculatedExtension = FILE_EXTENSION_REGEX.exec(short_name)
    if ((calculatedExtension) && (calculatedExtension.length > 0)) {
        extension = calculatedExtension[0]
    }
    const created_datetime = DateTimeService.getCurrentDateTime()
    const updated_datetime = DateTimeService.getCurrentDateTime()
    const extra = {}

    const meta = {
        id: generateMetaId(source_id, full_name, created_datetime, updated_datetime),
        short_name: short_name,
        full_name: full_name,
        source_id: source_id,
        extension: extension,
        created_datetime: created_datetime,
        updated_datetime: updated_datetime,
        extra: extra,
        indexed_datetime: DateTimeService.getCurrentDateTime()
    }

    return meta
}