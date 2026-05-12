const asyncHandler=(requestHandler)=>{
     return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>{
            console.error('[asyncHandler] caught error:', err.message)
            console.error('[asyncHandler] stack:', err.stack)
            next(err)
        })
    }
}
//yaha direct return promise format mai upr wala code
export {asyncHandler}


// const asyncHandler=(func)=> async (req,res,next)=>{
//     try {
//         await func(req,res,next)
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }

// }
// ye try catch wala h
//function ko function mai pass krdo fir ek callback


