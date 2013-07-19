var	_
=	require('underscore')

module.exports
=	function(app)
	{
		return	function(model,data,queries)
				{
					return 	(
								_.isUndefined(queries)
							||	(
									_.isUndefined(data.data)
								&&	_.isUndefined(data.count)
								)
							)
							?	app.build.resource(model,data)
							:	app.build.collection(model,data,queries)
				}
	}