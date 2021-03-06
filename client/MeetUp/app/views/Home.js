'use-strict'

import React, { Component } from 'react';
import {
  Text,
  View,
  ScrollView,
  AsyncStorage,
  LayoutAnimation,
  RefreshControl,
  } from 'react-native';
import { Actions } from 'react-native-router-flux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import SetStatusInline from "../components/SetStatusInline";

import { AccountTab, DiscoverTab } from '../tabViews';

import { server } from '../Constants';
var uuid = require('react-native-uuid');

const styles = {
  sceneContainer: {
    backgroundColor: "#FCFCFC"
  }
};

const rightButtonConfig = {
  'title': "status",
  handler: () => {

  }
};

export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refreshing: false,
      token: props.token,
      username: props.username,
      user_status: undefined,
      updateFormOpen: false,
      statuses: [],
      tabViewSelected: 'Home'
    }
  }

  componentWillMount() {
    console.log("Mounting");
    //have to do this because when using tabbar and switching from another tab
    //the token is removed from state so either do this and get the token again
    //from login's props OR grab from async storage
    if (!this.state.token) Actions.login();
    // Update statuses of people User follows.

    //setInterval(() => {this.updateStatuses()},2000);

    // Attempt to get the user's info.
    this.getUsername((res) => {
      if (res.success) { // on success...
        this.setState({username: res.username, token: res.token}); // set username in state
        this.updateStatuses();
      } else { // couldn't get User's info
        console.warn("Couldn't get username... Back to login...");
        Actions.login();
      }
    });
  }

  componentDidMount() {
    this.updateStatuses();
  }

  // Determine if we should re-render
  shouldComponentUpdate(nextProps, nextState) {
    if (JSON.stringify(this.state) == JSON.stringify(nextState)) { // TODO: no string comparison
      return false;
    } return true;
  }

  _onRefresh() {
    this.setState({refreshing: true});
    this.updateStatuses(() => {
      this.setState({refreshing: false});
    })
  }

  updateStatuses(callback) {
    this.following((json) => {
      this.setState({statuses: json});
    });
    this.getUserCurrentStatus((status) => { // get the users' status
      if (!(status.success === false))
        this.setState({user_status : status.availability});
    });
    if (callback)
      callback();
  }

  // Logic to handle status update events in navbar
  toggleStatusForm() {
    if (this.state.updateFormOpen) {
      this.setState({updateFormOpen: false});
      return;
    } this.setState({updateFormOpen: true});
    return;
  }

  //  try to retrive a logged in user from local storage on device
  getUsername = async (callback) => {
    try {
      const name = await AsyncStorage.getItem('username');
      const token = await AsyncStorage.getItem('token');
      if (name !== null && token !== null){
        // We have data!!
        callback({success: true, username: name, token: token});
      } else {
        console.warn("Login.js: username Not Set. Going back to login...");
        Actions.login();
      }
    } catch (error) {
      // Error retrieving data
      console.error(error);
    }
  }

  // Get the User's status and update UI in callback()
  getUserCurrentStatus(callback) {
    return fetch('https://'+server+'/api/users/status/?token='+this.state.token+'&username='+this.state.username, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      .then((response) => response.json())
      .then((responseJson) => {
        callback(responseJson);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  // Get the statuses of all the users that User follows
  following(callback) {
    return fetch('https://'+server+'/api/following/?token='+this.state.token, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      .then((response) => response.json())
      .then((responseJson) => {
        callback(responseJson);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  goToStatusDetailView(context) {
    // console.error(context);
    Actions.status_detail_view(context);
  }

  renderCards() {

    if (this.state.statuses.success === false || this.state.statuses.length == []) { // IDK WHY THIS WORKS
      return <View style={{flex:1, height:500, alignItems:'center', justifyContent:'center'}}><Text style={{color: '#90949C', fontSize: 30}}>🌚</Text><Text style={{color: '#90949C', fontSize: 18}}>No statuses</Text></View>
    }
    return (this.state.statuses.map((curr) => {return(<Card onPress={this.goToStatusDetailView.bind(this, curr)} key={uuid.v1()} available={curr.status?(curr.status.availability=='Busy'?false:true):false} username={curr.username}/>)}));
  }

  render() {
    return (
      <View style={[{flex: 1}, styles.sceneContainer]}>
        <Navbar
          status_enabled={true}
          status={this.state.user_status}
          onPress={this.toggleStatusForm.bind(this)}
          rightButton={rightButtonConfig}
        />

        <SetStatusInline
          open={this.state.updateFormOpen}
          token={this.state.token}
          username={this.state.username}/>
        <View style={{flex: 1, marginLeft: 10, marginRight: 10}}>
          <ScrollView
            style={{flex:1,marginTop: 8}}
            refreshControl={
              <RefreshControl
                refreshing={this.state.refreshing}
                onRefresh={this._onRefresh.bind(this)}
              />
            }
          >
            {this.renderCards()}
          </ScrollView>
        </View>
      </View>
    )
  }
};

class EmptyStatusIcon extends React.Component {
  render(){
    const account = (<Icon name="sentiment-dissatisfied" size={40} color='#90949C' style={{paddingBottom: 10}}/>)
    return (
      <View>{account}</View>
    );
  }
}
