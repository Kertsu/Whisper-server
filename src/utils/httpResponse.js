export const success = (res, data = null, message = null, code = 200) => {
    return res.status(code).json({
      success: true,
      data,
      message,
    });
  };
  

  export const error = (res, data = null, message = null, code = 400) => {
    return res.status(code).json({
      success: false,
      data,
      message,
    });
  };
  