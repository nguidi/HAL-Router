var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')
,	Q
=	require('q')

module.exports
=	function(app)
	{
		return	function(req,model,data,collection,embedded_type)
				{
					var	deferred
					=	Q.defer()

					if	(_.isEmpty(data))
						deferred
							.resolve(
								app.build.status(model.name,404)
							)
					else	{
						var	resource
						=	new	HAL.Resource(
									data
								,	model.url(data)
								)
						,	model_curies
						=	model.get_curies()
						
						_.each(
							app.get('curies').resource
						,	function(curie)
							{
								model_curies[curie.name]
								=	curie
							}
						)

						resource
							.link(
								'curies'
							,	_.map(
									model_curies
								,	function(curie)
									{
										return	curie
									}
								)
							)

						_.each(
							model.get_links(data)
						,	function(link_data,link)
							{
								resource
									.link(
										link
									,	link_data
									)
							}
						)

						_.each(
							model.get_resource_links(data)
						,	function(link_data,link)
							{
								resource
									.link(
										link
									,	link_data
									)
							}
						)

						if	(_.isEqual(embedded_type,"partial"))	{
							deferred
								.resolve(
									resource
								)
						}	else	{
							var	assocs
							=	model.get_associations(req,data)

							if	(_.isEmpty(assocs))
								deferred
									.resolve(
										resource
									)
							else
								Q.all(
									_.map(
										assocs
									,	function(assoc)
										{
											return	model.resolve_assoc(req,assoc,data)
										}
									)
								).then(
									function(embeddeds)
									{
										if	(!_.isEmpty(embeddeds))
											_.each(
												embeddeds
											,	function(embedded,index)
												{
													resource
														.embed(
															embedded.name
														,	embedded
														)
												}
											)
										deferred
											.resolve(
												resource
											)
									}
							)
						}
					}

					return	deferred.promise	
				}
	}