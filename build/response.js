var	_
=	require('underscore')

module.exports
=	function(app)
	{
		return	function(model,allowed,data,queries)
				{
					return 	_.isUndefined(data)
							?	app.build.status(400)
							:	(
									_.isUndefined(queries)
								||	(
										_.isUndefined(data.data)
									&&	_.isUndefined(data.count)
									)
								)
								?	app.build.resource(model,allowed,data)
								:	app.build.collection(model,allowed,data,queries)
				}
	}