var	Factory
=	function(
		_
	,	URL
	)
	{
		return	function(config)
				{

					this.Api_Association
					=	function(spec_key)
						{
							return	_.map(
										config.api_links
									,	function(link,rel)
										{
											return	{
												source: spec_key
											,	name: 'api:'+rel
											,	type: 'api'
											,	generate_links: function()
												{
													return	link
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