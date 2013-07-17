var	Factory
=	function(
		_
	,	URL
	,	Q
	,	HAL
	,	Store
	,	Models
	)
	{
		return	function(config,ACL)
				{					
					var	Status_codes
					=	new Models.Status_codes()

					this.Resource
					=	function(name,transform,mapping)
						{
							this.transform_name
							=	name

							this.template
							=	transform.template
							||	'/{transform_name}/{id}'
							
							this.associations
							=	_.map(
									transform.associations
								,	function(assoc,assoc_key)
									{
										return	new	Models.Association(name,assoc,assoc_key)
									}
								)

							if	(transform.root)
								this.associations
								=	_.union(
										this.associations
									,	new	Models.Api_Association(this.name)
									)

							this.fields
							=	mapping.fields
							
							//	Local Store, contains a stack resources.
							this.store
							=	new Object()

							this.find_assoc
							=	function(assoc_name)
								{
									return	_.find(
												this.associations
											,	function(assoc)
												{
													return	_.isEqual(assoc.name,assoc_name)
												}
											)
								}

							//	Get the resource url
							this.url
							=	function(data)
								{
									var resource_url
									=	uritemplate(
											this.template
										).expand(
											_.extend(
												_.clone(this)
											,	data
											)
										)

									return	URL.format(
													{
														protocol:	config.server.protocol
													,	hostname:	config.server.host
													,	port:		config.server.port
													,	pathname:	config.server.base+resource_url
													}
												)
								}

							this.get_assoc_target
							=	function(assoc_name)
								{
									var	assoc
									=	_.find(
											this.associations
										,	function(assoc)
											{
												return	_.isEqual(assoc.name,assoc_name)
											}
										)
									return	_.isDefined(assoc)
											?	assoc.target
											:	undefined
								}

							this.create_hal
							=	function(data,profile)
								{
									console.log("Resource.create_hal")
									var	hal_resource
									=	new HAL.Resource(
												data
											,	this.url(data)
											)

									_.each(
										this.associations
									,	function(assoc)
										{
											_.each(
												assoc.generate_links(data,profile)
											,	function(links,name)
												{
													var	filtered
													if	(_.isArray(links))	{
														filtered
														=	_.filter(
																links
															,	function(link)
																{
																	return	_.isUndefined(
																				_.find(
																					hal_resource._data._links[name]
																				,	function(linked_link)
																					{
																						return _.isEqual(link.name,linked_link.name)
																					}
																				)
																			)
																}	
															)
													}
													hal_resource
														.link(
															name
														,	_.isUndefined(filtered)
															?	links
															:	filtered
														)
												}
											)
										}
									)

									this.store[data.id]
									=	hal_resource

									return	hal_resource
								}
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['ModelResource']
	=	Factory
else
	module.exports
	=	Factory