var	Factory
=	function(
		_
	,	URL
	)
	{
		return	function(config)
				{
					var assoc_url
					=	URL.format(
								{
									protocol:	config.server.protocol
								,	hostname:	config.server.host
								,	port:		config.server.port
								,	pathname:	config.server.api_base+'/{model}/{id}/{assoc}'
								}
							)
					var curies
					=	[
							{
								name: 'api'
							,	href: URL.format(
											{
												protocol:	config.server.protocol
											,	hostname:	config.server.host
											,	port:		config.server.port
											,	pathname:	config.server.api_base+'/{api_action}'
											}
										)
							,	templated: true
							}
						,	{
								name:	'show'
							,	href:	assoc_url
							,	templated: true
							}
						,	{
								name:	'list'
							,	href:	assoc_url
							,	templated: true
							}
						,	{
								name:	'find'
							,	href:	assoc_url
							,	templated: true
							}
						,	{
								name:	'filter'
							,	href:	assoc_url
							,	templated: true
							}
						,	{
								name:	'update'
							,	href:	assoc_url
							,	templated: true
							}
						,	{
								name:	'create'
							,	href:	assoc_url
							,	templated: true
							}
						,	{
								name:	'delete'
							,	href:	assoc_url
							,	templated: true
							}
						]

					this.Curies
					=	function(type,ACL)
						{
							return	_.filter(
										curies
									,	function(curie)
										{
											return	_.isEqual(curie.name,type)
										}
									)
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelCuries']
	=	Factory
else
	module.exports
	=	Factory