var	HAL
=	require('../lib/hal.js').hal
,	_
=	require('underscore')

module.exports
=	function(app)
	{
		return	function(model,allowed,data)
				{
					var	resource
					=	new	HAL.Resource(
								_.pick(
									data
								,	model.get_fields()
								)
							,	model.url(app.get('base_url'),data)
							)

					resource
						.link(
							'curies'
						,	_.map(
								model.get_curies(allowed)
							,	function(curie)
								{
									return	curie
								}
							)
						)

					_.each(
						model.get_links(allowed,data)
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
						model.get_embeddeds(data)
					,	function(embedded)
						{
							resource
								.embed(
									embedded
								,	data[embedded]
								)
						}
					)

					return	resource	
				}
	}