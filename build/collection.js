var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')

module.exports
=	function(app)
	{
		return	function(model,collection,collection_query)
				{					
					return	new	HAL.Collection(
									{
										data:	_.map(
													collection.data
												,	function(data)
													{
														return	app.build.resource(model,data)
													}
												)
									,	count:	collection.count
									}
								,	model.url()
								,	collection_query
								)
				}
	}