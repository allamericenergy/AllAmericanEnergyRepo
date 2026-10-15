import { can } from "../security/permissions.js";
export function authorize(action) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!can(req.user.role, action)) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }
        return next();
    };
}
