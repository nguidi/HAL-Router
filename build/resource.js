var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')
,	Q
=	require('q')

module.exports
=	function(app)
	{
		return	function(req,model,data)
				{
					var	deferred
					=	Q.defer()

					if	(_.isEmpty(data))
						deferred
							.resolve(
								app.build.status(404)
							)
					else	{
						var	resource
						=	new	HAL.Resource(
									data
								,	model.url(data)
								)

						resource
							.link(
								'curies'
							,	_.map(
									model.get_curies()
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


					return	deferred.promise	
				}
	}