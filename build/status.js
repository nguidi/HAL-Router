var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')
,	uritemplate
=	require('../lib/uritemplates.js').parse

module.exports
=	function(app)
	{
		return	function(code)
				{
					return	new	HAL.Resource(
									app.get('status_codes')[code]
								,	app.get('base_url')
								+	uritemplate(
										'/status_codes/{code}'
									).expand(
										_.extend(
											{
												code:	code
											}
										)
									)
								)
				}
	}