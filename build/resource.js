var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')

module.exports
=	function(app)
	{
		return	function(model,data)
				{
					return	new	HAL.Resource(
									data
								,	model.url(data)
								)
				}
	}