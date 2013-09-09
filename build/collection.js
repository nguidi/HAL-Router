var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')
,	Q
=	require('q')

module.exports
=	function(app)
	{
		return	function(req,model,collection,collection_query,embedded_type)
				{					
					var	deferred
					=	Q.defer()
					,	url
					=	req.url

					if	(_.isEmpty(collection.data))
						deferred
							.resolve(
								app.build.status(model.name,404)
							)
					else
						Q.all(
							_.map(
								collection.data
							,	function(data)
								{
									return	app.build.resource(req,model,data,collection_query,embedded_type)
								}
							)
						).then(
							function(resource_collection)
							{
								var	resource
								=	new	HAL.Collection(
												{
													data:	resource_collection
												,	count:	collection.count
												,	_rel: 	model.name
												}
											,	url
											,	collection_query
											)

								resource
									.link(
										'curies'
									,	app.get('curies').collection
									)

								_.each(
									model.get_collection_links(url)
								,	function(link_data,link)
									{
										resource
											.link(
												link
											,	link_data
											)
									}
								)

								deferred
									.resolve(
										resource
									)
							}
						)

					return	deferred.promise
				}
	}