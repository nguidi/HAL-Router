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

							this.build_resource
							=	function(req,raw_data,partial)
								{
									console.log("Resource.build_resource")

									if	(_.isEmpty(raw_data))
										return	Status_codes
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