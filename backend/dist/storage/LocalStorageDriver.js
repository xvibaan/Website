"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageDriver = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validation_1 = require("./validation");
class LocalStorageDriver {
    name = 'local';
    uploadsDir;
    publicBaseUrl;
    constructor(options = {}) {
        this.uploadsDir = options.uploadsDir || path_1.default.resolve(process.cwd(), 'uploads');
        this.publicBaseUrl = (options.publicBaseUrl ||
            process.env.STORAGE_PUBLIC_BASE_URL ||
            process.env.BACKEND_PUBLIC_URL ||
            'http://localhost:4000').replace(/\/+$/, '');
        // Ensure uploads directory exists on initialization
        if (!fs_1.default.existsSync(this.uploadsDir)) {
            fs_1.default.mkdirSync(this.uploadsDir, { recursive: true });
        }
        const productsDir = path_1.default.join(this.uploadsDir, 'products');
        if (!fs_1.default.existsSync(productsDir)) {
            fs_1.default.mkdirSync(productsDir, { recursive: true });
        }
    }
    async upload(file, customKey) {
        const validation = (0, validation_1.validateImageFile)(file.buffer, file.mimetype, file.filename);
        if (!validation.isValid) {
            const err = new Error(validation.error || 'Invalid file');
            err.statusCode = 400;
            throw err;
        }
        const key = customKey || (0, validation_1.generateStorageKey)(validation.suggestedExtension || '.jpg');
        if (!(0, validation_1.isValidStorageKey)(key)) {
            const err = new Error('Invalid storage key generated');
            err.statusCode = 400;
            throw err;
        }
        const targetPath = path_1.default.resolve(this.uploadsDir, key);
        // Path traversal safety check: ensure targetPath is within uploadsDir
        if (!targetPath.startsWith(path_1.default.resolve(this.uploadsDir))) {
            const err = new Error('Path traversal attempt rejected');
            err.statusCode = 403;
            throw err;
        }
        // Ensure directory exists
        await fs_1.default.promises.mkdir(path_1.default.dirname(targetPath), { recursive: true });
        // Write file binary buffer
        await fs_1.default.promises.writeFile(targetPath, file.buffer);
        const publicUrl = `${this.publicBaseUrl}/uploads/${key}`;
        return {
            url: publicUrl,
            key,
            filename: path_1.default.basename(key),
            size: file.buffer.length,
            mimetype: validation.detectedMime || file.mimetype,
        };
    }
    async delete(key) {
        if (!(0, validation_1.isValidStorageKey)(key)) {
            // Reject any non-standard key format to prevent arbitrary file deletion
            const err = new Error(`Invalid storage key format '${key}'`);
            err.statusCode = 400;
            throw err;
        }
        const targetPath = path_1.default.resolve(this.uploadsDir, key);
        // Path traversal safety check
        if (!targetPath.startsWith(path_1.default.resolve(this.uploadsDir))) {
            const err = new Error('Path traversal attempt rejected');
            err.statusCode = 403;
            throw err;
        }
        try {
            await fs_1.default.promises.unlink(targetPath);
        }
        catch (err) {
            // Idempotent: If file does not exist, ignore ENOENT
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
}
exports.LocalStorageDriver = LocalStorageDriver;
