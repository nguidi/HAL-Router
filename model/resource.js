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
																?	Resources['Status_codes']
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
															Resources['Status_codes']
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
											?	Resources['Status_codes']
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


							this.build_resource
							=	function(req,raw_data,partial)
								{
									console.log("Resource.build_resource")

									if	(_.isEmpty(raw_data))
										return	Resources['Status_codes']
													.resolve(
														_.extend(
															req
														,	{
																status_code: 404
															}
														)
													)
									else	{
										var	deferred
										=	Q.defer()
										,	hal_result
										=	_.isDefined(this.store[raw_data.id])
											?	this.store[raw_data.id]
											:	this.create_hal(raw_data,req.session.profile)

										if	(partial)
											deferred
												.resolve(
													HAL.Resource.Partial(hal_result)
												)
										else
											Q.all(
												_.map(
													this.unresolved_assocs(
															hal_result
														)
												,	function(assoc)
													{
														return	assoc.generate_embedded(req,raw_data)
													}
												)
											).then(
												function(embeddeds)
												{
													_.each(
														embeddeds
													,	function(embeded,embeded_key)
														{
															if	(!_.isEmpty(embeded))
																hal_result
																	.embed(
																		embeded.name
																	,	embeded
																	)
														}
													)

													deferred
														.resolve(
															hal_result
														)
												}
											)
										
										return deferred.promise
									}
								}

							this.build_collection
							=	function(req,parsed,raw_collection,partial)
								{
									console.log("Resource.build_collection")
									var	deferred
									=	Q.defer()
									,	self
									=	this

									Q.all(
										_.map(
											raw_collection.data
										,	function(data)
											{
												return self.build_resource(req,data,partial)
											}
										)
									).then(
										function(collection)
										{
											deferred
												.resolve(
													new HAL.Collection(
															collection
														,	self.url()
														,	_.extend(
																parsed.body.collection_query
															,	{
																	count: raw_collection.count
																}
															)
														)
												)
										}
									)
									
									return deferred.promise
								}

							this.delete_resource
							=	function(req,id,raw_data)
								{
									console.log("Resource.delete_resource")
									delete	this.store[id]

									return	Resources['Status_codes']
													.resolve(
														_.extend(
															req
														,	{
																status_code: raw_data.code
															}
														)
													)
								}
							
							//	Search a resource in the Store (DB).
							this.show
							=	function(req,parsed,partial)
								{
									console.log("Resource.show")
									var	deferred
									=	Q.defer()
									,	self
									=	this

									partial
									=	partial
									||	false
									
									Store
										.show(this.name,parsed.id)
										.then(
											function(raw_data)
											{
												console.log("Resource.raw_data")
												self
													.build_resource(req,raw_data,partial)
													.then(
														function(hal_resource)
														{
															console.log("Resource.hal_resource")
															_.extend(
																hal_resource
															,	{
																	name: _.str.strLeftBack(self.name,'s')
																}
															)
															deferred
																.resolve(
																	hal_resource
																)
														}
													)
											}
										)

									return deferred.promise
								}

							//	Search a set of resources from the Store (DB)
							this.list
							=	function(req,parsed,partial)
								{
									console.log("Resource.list")
									var	deferred
									=	Q.defer()
									,	self
									=	this
									
									partial
									=	partial
									||	false

									Store
										.list(this.name,parsed.query)
										.then(
											function(raw_data)
											{
												console.log("Collection.raw_data")
												self
													.build_collection(req,parsed,raw_data,partial)
													.then(
														function(hal_collection)
														{
															console.log("Collection.hal_collection")
															_.extend(
																hal_collection
															,	{
																	name: self.name
																}
															)
															deferred
																.resolve(
																	hal_collection
																)
														}
													)
											}
										)

									return deferred.promise
								}

							//	Ask the Store (DB) to filter the resource collection given a set of data and add the resources obteined in the local store. If a resource exists in the local store it will be updated.
							this.filter
							=	function(req,parsed,partial)
								{
									console.log("Resource.filter")
									var	deferred
									=	Q.defer()
									,	self
									=	this
									,	store_func
									=	_.isDefined(parsed.body.through)
										?	'filter_through'
										:	'filter'
									
									partial
									=	partial
									||	false

									Store[store_func](this.name,parsed.body)
										.then(
											function(raw_data)
											{
												console.log("Collection.raw_data")
												self
													.build_collection(req,parsed,raw_data,partial)
													.then(
														function(hal_collection)
														{
															console.log("Collection.hal_collection")
															_.extend(
																hal_collection
															,	{
																	name: self.name
																}
															)
															deferred
																.resolve(
																	hal_collection
																)
														}
													)
											}
										)

									return deferred.promise
								}
							
							this.find
							=	function(req,parsed,partial)
								{
									console.log("Resource.find")
									var	deferred
									=	Q.defer()
									,	self
									=	this
									,	store_func
									=	parsed.body.through
										?	'find_through'
										:	'find'
									
									partial
									=	partial
									||	false

									Store
										Store[store_func](this.name,parsed.body)
										.then(
											function(raw_data)
											{
												console.log("Resource.raw_data")
												self
													.build_resource(req,raw_data,partial)
													.then(
														function(hal_resource)
														{
															console.log("Resource.hal_resource")
															_.extend(
																hal_resource
															,	{
																	name: _.str.strLeftBack(self.name,'s')
																}
															)
															deferred
																.resolve(
																	hal_resource
																)
														}
													)
											}
										)

									return deferred.promise
								}

							//	Ask the Store (DB) to update the given resource and if it exists in the local store it will be updated as well.
							this.update
							=	function(req,parsed)
								{
									console.log("Resource.update")
									var	deferred
									=	Q.defer()
									,	self
									=	this

									Store
										.update(this.name,parsed.id,_.omit(parsed.body,["query","collection_query"]))
										.then(
											function(raw_data)
											{
												self
													.build_resource(req,raw_data)
													.then(
														function(hal_resource)
														{
															_.extend(
																hal_resource
															,	{
																	name: _.str.strLeftBack(self.name,'s')
																}
															)
															deferred
																.resolve(
																	hal_resource
																)
														}
													)
											}
										)

									return	deferred.promise
								}

							//	Ask the Store (DB) to delete the given resource and if it exists in the local store it will be deleted as well.
							this.delete
							=	function(req,parsed)
								{
									console.log("Resource.delete")
									var	deferred
									=	Q.defer()
									,	self
									=	this

									Store
										.delete(this.name,parsed.id)
										.then(
											function(raw_data)
											{
												self
													.delete_resource(req,parsed.id,raw_data)
													.then(
														function(hal_resource)
														{
															_.extend(
																hal_resource
															,	{
																	name: _.str.strLeftBack(self.name,'s')
																}
															)
															deferred
																.resolve(
																	hal_resource
																)
														}
													)
											}
										)

									return	deferred.promise
								}

							//	Ask the Store (DB) to create a given resource and if will created in the local store as well.
							this.create
							=	function(req,parsed)
								{
									console.log("Resource.create")
									var	deferred
									=	Q.defer()
									,	self
									=	this

									Store
										.create(this.name,parsed.body.query)
										.then(
											function(raw_data)
											{
												self
													.build_resource(req,raw_data)
													.then(
														function(hal_resource)
														{
															_.extend(
																hal_resource
															,	{
																	name: _.str.strLeftBack(self.name,'s')
																}
															)
															deferred
																.resolve(
																	hal_resource
																)
														}
													)
											}
										)

									return	deferred.promise
								}

							//	Ask the Store (DB) to join the given resource using a set of data.
							this.join
							=	function(req,parsed)
								{
									return	Store.find(this.name,parsed.id)
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