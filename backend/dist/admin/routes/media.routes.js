"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaAdminRoutes = void 0;
const storage_1 = require("../../storage");
const mediaAdminRoutes = async (app) => {
    /**
     * POST /api/v1/admin/media/upload
     * Authenticated Admin-only endpoint for uploading product images.
     * Expects multipart/form-data with a single file field.
     * Validates file size (max 5 MB), MIME type, SVG rejection, and binary magic bytes.
     */
    app.post('/upload', async (request, reply) => {
        let filePart;
        try {
            filePart = await request.file();
        }
        catch (err) {
            if (err.code === 'FST_REQ_FILE_TOO_LARGE' || err.message?.includes('limit')) {
                return reply.status(413).send({
                    statusCode: 413,
                    error: 'PayloadTooLarge',
                    message: 'File size exceeds the 5 MB limit.',
                });
            }
            throw err;
        }
        if (!filePart) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'No file provided in multipart/form-data request.',
            });
        }
        let buffer;
        try {
            buffer = await filePart.toBuffer();
        }
        catch (err) {
            if (err.code === 'FST_REQ_FILE_TOO_LARGE' || filePart.file.truncated) {
                return reply.status(413).send({
                    statusCode: 413,
                    error: 'PayloadTooLarge',
                    message: 'File size exceeds the 5 MB limit.',
                });
            }
            throw err;
        }
        if (filePart.file.truncated || buffer.length > storage_1.MAX_FILE_SIZE_BYTES) {
            return reply.status(413).send({
                statusCode: 413,
                error: 'PayloadTooLarge',
                message: 'File size exceeds the 5 MB limit.',
            });
        }
        // Validate MIME, magic bytes, and SVG rejection
        const validation = (0, storage_1.validateImageFile)(buffer, filePart.mimetype, filePart.filename);
        if (!validation.isValid) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: validation.error || 'Invalid image file.',
            });
        }
        try {
            const storage = (0, storage_1.getStorageDriver)();
            const result = await storage.upload({
                buffer,
                filename: filePart.filename,
                mimetype: validation.detectedMime || filePart.mimetype,
            });
            return reply.status(200).send({
                success: true,
                url: result.url,
                key: result.key,
                filename: result.filename,
                size: result.size,
                mimetype: result.mimetype,
            });
        }
        catch (err) {
            request.log.error({ err }, 'Media upload failed');
            const statusCode = err.statusCode || 500;
            return reply.status(statusCode).send({
                statusCode,
                error: err.name || 'StorageUploadError',
                message: err.message || 'Failed to upload media asset.',
            });
        }
    });
    /**
     * DELETE /api/v1/admin/media/*
     * Authenticated Admin-only endpoint for deleting a stored product image.
     * Key can be passed as wildcard path (e.g. DELETE /api/v1/admin/media/products/<uuid>.jpg)
     * or query parameter (?key=products/<uuid>.jpg).
     */
    const deleteHandler = async (request, reply) => {
        const wildcardParam = request.params['*'] || '';
        const queryKey = request.query?.key || '';
        const bodyKey = request.body?.key || '';
        let key = wildcardParam.trim() || queryKey.trim() || bodyKey.trim();
        // Decode URL component if needed
        try {
            key = decodeURIComponent(key);
        }
        catch { }
        if (!key) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: 'Media storage key is required.',
            });
        }
        // Ensure key format matches products/<uuid>.<ext> to prevent arbitrary path traversal
        if (!(0, storage_1.isValidStorageKey)(key)) {
            return reply.status(400).send({
                statusCode: 400,
                error: 'BadRequest',
                message: `Invalid or unsafe storage key '${key}'. Key must match 'products/<uuid>.<extension>'.`,
            });
        }
        try {
            const storage = (0, storage_1.getStorageDriver)();
            await storage.delete(key);
            return reply.status(200).send({
                success: true,
                message: `Media '${key}' deleted successfully.`,
                key,
            });
        }
        catch (err) {
            request.log.error({ err, key }, 'Media deletion failed');
            const statusCode = err.statusCode || 500;
            return reply.status(statusCode).send({
                statusCode,
                error: err.name || 'StorageDeleteError',
                message: err.message || 'Failed to delete media asset.',
            });
        }
    };
    app.delete('/', deleteHandler);
    app.delete('/*', deleteHandler);
};
exports.mediaAdminRoutes = mediaAdminRoutes;
