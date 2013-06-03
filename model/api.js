var	Factory
=	function(
		_
	,	URL
	,	Curies
	)
	{
		return	function(config)
				{

					this.Api_Association
					=	function(spec_key)
						{
							return	_.map(
										config.application.links
									,	function(link,rel)
										{
											return	{
												source:	spec_key
											,	name:	rel
											,	type:	'api'
											,	href:	link
											,	generate_links: function()
												{
													var	curies
													=	Curies.get(this.type)
													,	links
													=	{
															curies: curies
														}
													_.extend(
														links
													,	_.object(
															[this.type+':'+this.name]
														,	[
																{
																	name: this.name
																,	href: this.href
																}
															]
														)
													)
													return	links
												}
											}
										}
									)
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelApi']
	=	Factory
else
	module.exports
	=	Factory