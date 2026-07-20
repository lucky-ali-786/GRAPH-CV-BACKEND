export const asynchandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
          
            const status = (error.Statuscode && error.Statuscode >= 100 && error.Statuscode <= 599)
                ? error.Statuscode
                : 500;

            return res.status(status).json({
                success: false,
                message: error.message || "Internal server error"
            });
        });
    };
};
