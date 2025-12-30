import { Button, Layout, Text } from '@ui-kitten/components';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function MyPostModal() {
	return (
		<Layout style={styles.container}>
			<Text category="h5" style={styles.title}>My Post</Text>
			<Text appearance="hint">This modal is under construction.</Text>
			<View style={{ height: 12 }} />
			<Button onPress={() => router.back()}>Close</Button>
		</Layout>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	title: {
		marginBottom: 8,
	},
});

