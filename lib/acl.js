var	Factory
=	function(
		_
	,	Store
	,	Q
	,	ACL
	)
	{
		return	function(config)
				{
					this.stored
					=	{}

					this.create
					=	function()
						{
							var deferred
							=	Q.defer()
							,	self
							=	this
							
							Q.all(
								[
									Store.list(config.acl.profiles,{})
								,	Store.list(config.acl.profiles_groups,{})
								,	Store.list(config.acl.groups,{})
								,	Store.list(config.acl.groups_acos,{})
								,	Store.list(config.acl.acos,{})
								,	Store.list(config.acl.assocs,{})
								,	Store.list(config.acl.groups_permissions,{})
								,	Store.list(config.acl.groups_acos_permissions,{})
								,	Store.list(config.acl.groups_acos_assocs,{})
								,	Store.list(config.acl.groups_acos_assocs_permissions,{})
								,	Store.list(config.acl.permissions,{})
								]
							).spread(
								function(profiles,profiles_groups,groups,groups_acos,acos,assocs,groups_permissions,groups_acos_permissions,groups_acos_assocs,groups_acos_assocs_permissions,permissions)
								{				
									var	getPermissions
									=	function(whats,key,value)
										{
											return	_.map(
														_.filter(
															whats
														,	function(what)
															{
																return	_.isEqual(what[key],value)
															}
														)
													,	function(fwhat)
														{
															return	_.extend(
																		_.find(
																			permissions.data
																		,	function(permission)
																			{
																				return	_.isEqual(permission.id,fwhat.id_permission)
																			}
																		)
																	,	{
																			allow:	fwhat.allow
																		}
																	)
														}
													)
										}
									,	getFiltered
									=	function(whats,key,value)
										{
											return	JSON.parse(
														JSON.stringify(
															_.filter(
																whats
															,	function(what)
																{
																	return	_.isEqual(what[key],value)
																}
															)
														||	[]
														)
													)
										}
									,	getFound
									=	function(whats,key,value)
										{
											return	JSON.parse(
														JSON.stringify(
															_.find(
																whats
															,	function(what)
																{
																	return	_.isEqual(what[key],value)
																}
															)
														||	{}
														)
													)
										}
									,	getFound2
									=	function(whats,key,value,key2,value2)
										{
											return	JSON.parse(
														JSON.stringify(
															_.find(
																whats
															,	function(what)
																{
																	return	_.isEqual(what[key],value)
																		&&	_.isEqual(what[key2],value2)
																}
															)
														||	{}
														)
													)
										}
									,	joinPermissions
									=	function()
										{
											var	joined
											=	[]
											_.each(
												arguments
											,	function(arg)
												{
													joined
													=	_.union(joined,arg)
												}
											)
											return	joined
										}

									//	Nego TODO	
									ACL.deny()

									//	Agrego Roles (Perfiles) al ACL
									_.each(
										profiles.data
									,	function(profile)
										{
											ACL.addRole(profile.name)

										}
									)

									//	Agrego Recursos (Acos) al ACL
									_.each(
										acos.data
									,	function(aco)
										{
											ACL.addResource(aco.name)
										}
									)
									var	cgroups
									=	JSON.parse(
											JSON.stringify(
												groups.data
											)
										)
									,	cprofiles
									=	JSON.parse(
											JSON.stringify(
												profiles.data
											)
										)
									_.map(
										cgroups
									,	function(group)
										{
											return	_.extend(
														group
													,	{
															permissions:	getPermissions(groups_permissions.data,'id_group',group.id)
														,	acos:			_.map(
																				getFiltered(groups_acos.data,'id_group',group.id)
																			,	function(fga)
																				{
																					return	_.extend(
																								getFound(acos.data,'id',fga.id_aco)
																							,	{
																									permissions:	getPermissions(groups_acos_permissions.data,'id_group_aco',fga.id)
																								,	assocs:			_.map(
																														getFiltered(assocs.data,'id_aco',fga.id_aco)
																													,	function(faa)
																														{
																															return	_.extend(
																																		getFound(acos.data,'id',faa.id_assoc)
																																	,	{
																																			permissions:	getPermissions(
																																								groups_acos_assocs_permissions.data
																																							,	'id_group_aco_assoc'
																																							,	getFound2(groups_acos_assocs.data,'id_group_aco',fga.id,'id_assoc',faa.id).id
																																							)
																																		}
																																	)
																														}
																													)
																								}
																							)
																				}
																			)
														}
													)	
										}
									)
									_.each(
										_.map(
											cprofiles
										,	function(profile)
											{
												return	_.extend(
															profile
														,	{
																groups:	_.map(
																			getFiltered(profiles_groups.data,'id_profile',profile.id)
																		,	function(fpg)
																			{
																				return	getFound(cgroups,'id',fpg.id_group)
																			}
																		)
															}
														)
											}
										)
									,	function(profile)
										{
											_.each(
												profile.groups
											,	function(group)
												{
													_.each(
														group.acos
													,	function(aco)
														{
															_.each(
																joinPermissions(group.permissions,aco.permissions)
															,	function(permission)
																{
																	ACL[
																		permission.allow
																		?	'allow'
																		:	'deny'
																	](
																		profile.name
																	,	aco.name
																	,	permission.name
																	)
																}
															)
															_.each(
																aco.assocs
															,	function(assoc)
																{
																	_.each(
																		joinPermissions(group.permissions,aco.permissions,assoc.permissions)
																	,	function(permission)
																		{
																			ACL[
																				permission.allow
																				?	'allow'
																				:	'deny'
																			](
																				profile.name
																			,	aco.name+':'+assoc.name
																			,	permission.name
																			)
																		}
																	)
																}
															)
														}
													)
												}
											)
										}
									)

									self.stored
									=	{
											roles:			cprofiles
										,	groups:			cgroups
										,	acos:			acos.data
										,	permissions:	permissions.data
										}

									deferred
										.resolve(
											ACL
										)

								}
							)
						
							return	deferred.promise
						}

					this.find_role
					=	function(profile)
						{
							return	_.find(
										this.stored.roles
									,	function(rol)
										{
											return	_.isString(profile)
													?	_.isEqual(rol.profile,profile)
													:	_.isEqual(rol.id,profile)
										}
									)
						}
				}
	}
if(
	typeof module === 'undefined'
)
	this['hal']
	=	Factory
else
	module.exports
	=	Factory
