var	Factory
=	function(
		_
	,	URL
	,	Q
	,	HAL
	,	Models
	,	Builder
	)
	{
		return	function(config,ACL)
				{					
					var	Status_codes
					=	new Models.Status_codes()

					this.Resource
					=	function(name,transform,mapping)
						{
							this.name
							=	name
							
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

							//	Resolve a request. Decides how to proceed. Also known as Partial embedded Resolve
							this.resolve
							=	function(req)
								{
									console.log("Resource.resolve(FULL)")
									var deferred
									=	Q.defer()
									,	parsed
									=	this.parse_url(req)
									,	self
									=	this

									if	(_.isDefined(parsed.subcollection))
										parsed
										=	this.parse_url(
													Resources[_.str.capitalize(parsed.collection)]
														.assoc_method(
															req
														,	parsed.subcollection
														,	{
																id:	parsed.id
															}
														)
												)

									var	method
									=	_.isEqual(parsed.method,'GET') || _.isUndefined(parsed.method)
										?	_.isDefined(parsed.id)
												?	'show'
												:	'list'
										:	_.isEqual(parsed.method,'PUT')
											?	'update'
											: 	_.isEqual(parsed.method,'DELETE')
												?	'delete'
												:	parsed.body.action

									ACL
										.query(
											req.session.profile
										,	this.name
										,	_.contains(['show','list'],method)
											?	'view'
											:	method
										,	function(err, allowed)
											{
												if	(allowed)	{
													deferred
														.resolve(
															_.isObject(method)
															?	self[method.body.action](req,parsed)
															:	_.isUndefined(self[method])
																?	Status_codes
																		.resolve(
																			_.extend(
																				req
																			,	{
																					status_code: 405
																				}
																			)
																		)
																:	self[method](req,parsed)
														)
												} else {
													deferred
														.resolve(
															Status_codes
																		.resolve(
																			_.extend(
																				req
																			,	{
																					status_code: 403
																				}
																			)
																		)
														)
												}
											}
										)

									return	deferred.promise
								}

							//	Resolve a request but without embeddeds (only links). Also known as Single embedded Resolve
							this.resolve_partial
							=	function(req)
								{
									console.log("Resource.resolve(PARTIAL)")
									var deferred
									=	Q.defer()
									,	parsed
									=	this.parse_url(req)
									,	method
									=	parsed.body.action

									deferred
										.resolve(
											_.isUndefined(this[method])
											?	Status_codes
													.resolve(
														_.extend(
															req
														,	{
																status_code: 405
															}
														)
													)
											:	this[method](req,parsed,true)
										)

									return	deferred.promise
								}

							//	Parse a request url
							this.parse_url
							=	function(req)
								{
									var parsed_url
									=	URL.parse(req.url).pathname
									,	url
									=	URL.parse(parsed_url.match(RegExp('^'+config.server.base+'(.*)$'))[1]).pathname
									,	splited
									=	url.split('/')
									,	collection_query
									=	_.extend(
											_.object(
												['type','ipp','page']
											,	['list',0,1]
											)
										,	_.pick(
												_.isEqual(req.method,'POST')
												?	req.body.collection_query
												||	{}
												:	URL.parse(req.url,true).query
											,	['type','ipp','page']
											)
										)
									_.each(
										['ipp','page']
									,	function(val)
										{
											collection_query[val]
											=	parseInt(collection_query[val])
										}
									)
									return	{
												method:			req.method
											,	url:			req.url
											,	data_url:		url
											,	collection:		splited[1]
											,	id:				splited[2]
											,	subcollection:	splited[3]
											,	body:			_.extend(
																	req.body
																,	{
																	collection_query: collection_query
																	}
																)
											,	query:			collection_query
											}
								}

							this.assoc_method
							=	function(req,assoc_key,data)
								{
									var	assoc
									=	_.find(
											this.associations
										,	function(assoc)
											{
												return	_.isEqual(assoc.name,assoc_key)
											}
										)

									return	assoc.create_request(req,data)
								}

							//	Get the resource url
							this.url
							=	function(data)
								{
									var resource_url
									=	_.isDefined(data)
										?	this.name+'/'+data.id
										:	this.name

									return	URL.format(
													{
														protocol:	config.server.protocol
													,	hostname:	config.server.host
													,	port:		config.server.port
													,	pathname:	config.server.base+'/'+resource_url
													}
												)
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

							this.unresolved_assocs
							=	function(stored)
								{
									console.log("Resource.unresolved_assocs")
									return	_.filter(
												this.associations
											,	function(assoc)
												{
													return	_.isUndefined(stored._data._embedded[assoc.name])
														&&	!_.isEqual(assoc.type,'api') 	
												}
											)
								}

							this.delete_resource
							=	function(req,id,raw_data)
								{
									console.log("Resource.delete_resource")
									delete	this.store[id]

									return	Status_codes
													.resolve(
														_.extend(
															req
														,	{
																status_code: raw_data.code
															}
														)
													)
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