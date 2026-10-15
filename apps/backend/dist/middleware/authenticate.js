import { verifyAccessToken } from "../security/auth.js";
export function authenticate(req, res, next) {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: "Missing bearer token" });
    }
    try {
        req.user = verifyAccessToken(token);
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
