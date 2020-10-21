/**
 * Extrae el token de un request
 * 
 * @param {*} req request
 */
exports.getBearerToken = (req) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        return bearer[1];
    }

    return null;
}