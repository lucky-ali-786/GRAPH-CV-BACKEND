class ApiError extends Error{
    constructor(
        Statuscode,
        message='something went wrong',
        errors =[],
        stack="",
)
{
        super(message)
        this.Statuscode=Statuscode
        this.data=null
        this.message=message
        this.success=false
        this.errors=errors

}
}
export{ApiError}
