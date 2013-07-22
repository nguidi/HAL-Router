var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')

module.exports
=	function(app)
	{
		return	function(model,allowed,collection,collection_query)
				{					
					return	new	HAL.Collection(
									{
										data:	_.map(
													collection.data
												,	function(data)
													{
														return	app.build.resource(model,allowed,data)
													}
												)
									,	count:	collection.count
									}
								,	model.url(app.get('base_url'))
								,	collection_query
								)
				}
	}