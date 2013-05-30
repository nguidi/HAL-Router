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
					,	api_url
					=	URL.format(
								{
									protocol:	config.server.protocol
								,	hostname:	config.server.host
								,	port:		config.server.port
								,	pathname:	config.server.api_base+'/{api_action}'
								}
							)
					,	curies
					=	{
							api:
							[
								{
									name:		'api'
								,	href:		api_url
								,	templated:	true
								}
							]
						,	'has-one':
							[
								{
									name:		'show'
								,	href:		assoc_url
								,	templated:	true
								}
							,	{
									name:		'update'
								,	href:		assoc_url
								,	templated:	true
								}
							,	{
									name:		'create'
								,	href:		assoc_url
								,	templated:	true
								}
							,	{
									name:		'delete'
								,	href:		assoc_url
								,	templated:	true
								}
							]
						,	'belongs-to':
							[
								{
									name:		'show'
								,	href:		assoc_url
								,	templated:	true
								}
							]
						,	'has-many':
							[
								{
									name:		'list'
								,	href:		assoc_url
								,	templated:	true
								}
							,	{
									name:		'find'
								,	href:		assoc_url
								,	templated:	true
								}
							,	{
									name:		'filter'
								,	href:		assoc_url
								,	templated:	true
								}
							]
						,	'has-many-and-belongs-to':
							[
								{
									name:		'find'
								,	href:		assoc_url
								,	templated:	true
								}
							,	{
									name:		'filter'
								,	href:		assoc_url
								,	templated:	true
								}
							]
						}

					this.get
					=	function(type)
						{
							return	curies[type.split(':')[0]]
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